import { EventEmitter } from 'events';
import { HybridStorage } from '../storage/types';
import { HealthMonitor } from '../health/HealthMonitor';
import { DataSource, SlotRange, RawTransactionData } from './types';

export interface BackfillQueueConfig {
  maxQueueSize: number;
  maxAttempts: number;
  processingInterval: number; // ms
  concurrentProcessing: number;
  retryDelayMs: number;
}

interface QueueItem {
  slotRange: SlotRange;
  priority: number;
  attempts: number;
  lastAttempt?: Date;
  inProgress: boolean;
  dataSourceId?: string;
}

interface QueueStatus {
  queueLength: number;
  inProgress: number;
  completed: number;
  failed: number;
  earliestSlot?: number;
  latestSlot?: number;
}

/**
 * BackfillQueue is responsible for managing backfill operations
 * for historical data when there are gaps in the chain data.
 */
export class BackfillQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private status: QueueStatus;
  private storage: HybridStorage;
  private config: BackfillQueueConfig;
  private timer: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private dataSources: Map<string, DataSource> = new Map();
  private healthMonitor: HealthMonitor | null = null;
  
  constructor(config: BackfillQueueConfig, storage: HybridStorage) {
    super();
    this.config = config;
    this.storage = storage;
    
    this.status = {
      queueLength: 0,
      inProgress: 0,
      completed: 0,
      failed: 0
    };
  }
  
  /**
   * Set the health monitor to check data source health
   */
  setHealthMonitor(healthMonitor: HealthMonitor): void {
    this.healthMonitor = healthMonitor;
  }
  
  /**
   * Register a data source that can be used for backfilling
   */
  registerDataSource(dataSource: DataSource): void {
    this.dataSources.set(dataSource.id, dataSource);
  }
  
  /**
   * Start processing the backfill queue
   */
  start(): void {
    if (this.running) {
      return;
    }
    
    this.running = true;
    
    // Start the processing timer
    this.timer = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
    
    console.log(`Backfill queue started, processing every ${this.config.processingInterval}ms`);
  }
  
  /**
   * Stop processing the backfill queue
   */
  stop(): void {
    if (!this.running) {
      return;
    }
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.running = false;
    console.log('Backfill queue stopped');
  }
  
  /**
   * Add a slot range to the backfill queue
   */
  addToQueue(slotRange: SlotRange, priority: number = 1): boolean {
    // Check if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      console.warn(`Backfill queue is full, cannot add slot range ${slotRange.fromSlot}-${slotRange.toSlot}`);
      return false;
    }
    
    // Check if this slot range overlaps with any existing items
    const overlaps = this.queue.some(item => 
      (slotRange.fromSlot <= item.slotRange.toSlot && 
       slotRange.toSlot >= item.slotRange.fromSlot)
    );
    
    if (overlaps) {
      console.warn(`Slot range ${slotRange.fromSlot}-${slotRange.toSlot} overlaps with existing queue items`);
      return false;
    }
    
    // Add to queue
    this.queue.push({
      slotRange,
      priority,
      attempts: 0,
      inProgress: false
    });
    
    // Sort queue by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.updateStatus();
    
    console.log(`Added slot range ${slotRange.fromSlot}-${slotRange.toSlot} to backfill queue`);
    this.emit('itemAdded', slotRange);
    
    return true;
  }
  
  /**
   * Process the next batch of items in the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.running || this.queue.length === 0) {
      return;
    }
    
    // Get available healthy data sources
    const dataSources = this.getHealthyDataSources();
    if (dataSources.length === 0) {
      console.warn('No healthy data sources available for backfill');
      return;
    }
    
    // Count how many items are currently in progress
    const inProgressCount = this.queue.filter(item => item.inProgress).length;
    
    // Calculate how many more items we can process
    const availableSlots = Math.max(0, this.config.concurrentProcessing - inProgressCount);
    if (availableSlots === 0) {
      return;
    }
    
    // Get the next batch of items to process
    const itemsToProcess = this.queue
      .filter(item => !item.inProgress)
      .slice(0, availableSlots);
    
    // Process each item
    for (const item of itemsToProcess) {
      // Mark as in progress
      item.inProgress = true;
      item.lastAttempt = new Date();
      item.attempts++;
      
      // Assign a data source
      const dataSource = dataSources[0]; // Use highest priority data source
      item.dataSourceId = dataSource.id;
      
      // Process in the background
      this.processItem(item, dataSource).catch(error => {
        console.error(`Error processing backfill item ${item.slotRange.fromSlot}-${item.slotRange.toSlot}:`, error);
      });
    }
    
    this.updateStatus();
  }
  
  /**
   * Process a single backfill item
   */
  private async processItem(item: QueueItem, dataSource: DataSource): Promise<void> {
    try {
      console.log(`Processing backfill for slot range ${item.slotRange.fromSlot}-${item.slotRange.toSlot} using data source ${dataSource.id}`);
      
      // Process each slot in the range
      for (let slot = item.slotRange.fromSlot; slot <= item.slotRange.toSlot; slot++) {
        if (!this.running) {
          // If we've been stopped, mark item as not in progress and return
          item.inProgress = false;
          this.updateStatus();
          return;
        }
        
        try {
          // Get transactions for this slot
          const transactions = await dataSource.getTransactionsBySlot(slot);
          
          // Store each transaction in time series database
          for (const tx of transactions) {
            await this.storage.timeSeries.insert('transactions', {
              timestamp: new Date(),
              data: tx,
              tags: {
                signature: tx.signature,
                slot: tx.slot.toString(),
                source: dataSource.id
              }
            });
          }
          
          console.log(`Processed slot ${slot} with ${transactions.length} transactions`);
        } catch (error) {
          console.error(`Error processing slot ${slot}:`, error);
          // Continue to next slot despite error
        }
      }
      
      // Mark item as completed
      this.removeItem(item);
      this.status.completed++;
      
      console.log(`Completed backfill for slot range ${item.slotRange.fromSlot}-${item.slotRange.toSlot}`);
      this.emit('itemCompleted', item.slotRange);
      
    } catch (error) {
      console.error(`Failed to process backfill item:`, error);
      
      // Check if we should retry
      if (item.attempts < this.config.maxAttempts) {
        // Mark for retry
        item.inProgress = false;
        console.log(`Will retry slot range ${item.slotRange.fromSlot}-${item.slotRange.toSlot} (attempt ${item.attempts}/${this.config.maxAttempts})`);
      } else {
        // Mark as failed
        this.removeItem(item);
        this.status.failed++;
        console.error(`Failed to backfill slot range ${item.slotRange.fromSlot}-${item.slotRange.toSlot} after ${item.attempts} attempts`);
        this.emit('itemFailed', item.slotRange);
      }
    }
    
    this.updateStatus();
  }
  
  /**
   * Get the current queue status
   */
  getStatus(): QueueStatus {
    return { ...this.status };
  }
  
  /**
   * Remove an item from the queue
   */
  private removeItem(item: QueueItem): void {
    const index = this.queue.indexOf(item);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.updateStatus();
    }
  }
  
  /**
   * Update the queue status
   */
  private updateStatus(): void {
    this.status.queueLength = this.queue.length;
    this.status.inProgress = this.queue.filter(item => item.inProgress).length;
    
    // Find earliest and latest slots
    if (this.queue.length > 0) {
      this.status.earliestSlot = Math.min(
        ...this.queue.map(item => item.slotRange.fromSlot)
      );
      this.status.latestSlot = Math.max(
        ...this.queue.map(item => item.slotRange.toSlot)
      );
    } else {
      this.status.earliestSlot = undefined;
      this.status.latestSlot = undefined;
    }
    
    // Emit status update
    this.emit('statusUpdated', this.status);
  }
  
  /**
   * Get a list of healthy data sources sorted by priority
   */
  private getHealthyDataSources(): DataSource[] {
    if (!this.healthMonitor) {
      // If no health monitor, return all data sources
      return Array.from(this.dataSources.values())
        .sort((a, b) => b.priority - a.priority);
    }
    
    return this.healthMonitor.getHealthyDataSources();
  }
} 