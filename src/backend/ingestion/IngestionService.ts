import { EventEmitter } from 'events';
import { 
  IngestionService as IIngestionService,
  IngestionConfig,
  IngestionStatus,
  IngestionMode,
  IngestionError,
  DataSourceConfig,
  DataSource,
  DataSourceType,
  TransactionProcessor,
  RawTransactionData
} from './types';
import { HybridStorage } from '../storage/types';
import { HealthMonitor, HealthStatus } from '../health/HealthMonitor';
import { RpcDataSource } from './RpcDataSource';
import { BackfillQueue, BackfillQueueConfig } from './BackfillQueue';
import { NetworkStatus } from '../health-monitor/types';

/**
 * Implementation of the IngestionService
 * Handles data ingestion from multiple sources with fallback capability
 */
export class IngestionService extends EventEmitter implements IIngestionService {
  private config!: IngestionConfig;
  private storage!: HybridStorage;
  private dataSources: Map<string, DataSource> = new Map();
  private processors: Set<TransactionProcessor> = new Set();
  private status: IngestionStatus;
  private healthMonitor: HealthMonitor;
  private backfillQueue!: BackfillQueue;
  private running: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, number> = new Map();
  private lastProcessedSlot: number = 0;
  private slotGapDetectionEnabled: boolean = true;
  
  constructor(healthMonitor: HealthMonitor) {
    super();
    
    this.healthMonitor = healthMonitor;
    
    // Initialize with default status
    this.status = {
      mode: IngestionMode.LIVE,
      activeDataSourceId: '',
      itemsProcessed: 0,
      itemsQueued: 0,
      errors: [],
      warnings: [],
      networkStatus: NetworkStatus.OPTIMAL,
      startTime: new Date(),
      lastUpdate: new Date()
    };
  }

  /**
   * Initialize the ingestion service
   */
  async initialize(config: IngestionConfig, storage: HybridStorage): Promise<void> {
    this.config = config;
    this.storage = storage;
    
    // Create backfill queue
    const backfillConfig: BackfillQueueConfig = {
      maxQueueSize: 10000,
      maxAttempts: 5,
      processingInterval: 30000, // 30 seconds
      concurrentProcessing: 5,
      retryDelayMs: 5000 // 5 seconds
    };
    
    this.backfillQueue = new BackfillQueue(backfillConfig, storage);
    this.backfillQueue.setHealthMonitor(this.healthMonitor);
    
    // Set up backfill queue event handlers
    this.setupBackfillEventHandlers();
    
    // Initialize data sources from config
    await this.initializeDataSources();
    
    console.log('Ingestion service initialized');
  }
  
  /**
   * Start the ingestion service
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    
    this.running = true;
    this.status.startTime = new Date();
    
    // Start the backfill queue
    this.backfillQueue.start();
    
    // Start ingestion based on mode
    switch (this.config.mode) {
      case IngestionMode.LIVE:
        await this.startLiveIngestion();
        break;
      case IngestionMode.BACKFILL:
        await this.startBackfillIngestion();
        break;
      case IngestionMode.BATCH:
        await this.startBatchIngestion();
        break;
    }
    
    console.log(`Ingestion service started in ${this.config.mode} mode`);
  }
  
  /**
   * Stop the ingestion service
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Unsubscribe from all subscriptions
    await this.unsubscribeAll();
    
    // Stop the backfill queue
    this.backfillQueue.stop();
    
    this.running = false;
    console.log('Ingestion service stopped');
  }
  
  /**
   * Pause the ingestion service
   */
  async pause(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    // Pause polling but don't unsubscribe
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Pause backfill queue
    this.backfillQueue.stop();
    
    console.log('Ingestion service paused');
  }
  
  /**
   * Resume the ingestion service
   */
  async resume(): Promise<void> {
    if (!this.running) {
      await this.start();
      return;
    }
    
    // Resume backfill queue
    this.backfillQueue.start();
    
    // Resume polling based on mode
    if (this.config.mode === IngestionMode.LIVE || this.config.mode === IngestionMode.BACKFILL) {
      this.startPolling();
    }
    
    console.log('Ingestion service resumed');
  }
  
  /**
   * Get the current ingestion status
   */
  getStatus(): IngestionStatus {
    // Update queue status
    const queueStatus = this.backfillQueue.getStatus();
    this.status.itemsQueued = queueStatus.queueLength;
    this.status.lastUpdate = new Date();
    
    return { ...this.status };
  }
  
  /**
   * Add a new data source
   */
  async addDataSource(config: DataSourceConfig): Promise<void> {
    // Create data source based on type
    const dataSource = this.createDataSource(config);
    
    // Register with health monitor
    this.healthMonitor.addDataSource(dataSource);
    
    // Register with backfill queue
    this.backfillQueue.registerDataSource(dataSource);
    
    // Store in our map
    this.dataSources.set(config.id, dataSource);
    
    // Connect if we're running
    if (this.running) {
      try {
        await dataSource.connect();
      } catch (error) {
        console.error(`Failed to connect to data source ${config.id}:`, error);
      }
    }
  }
  
  /**
   * Remove a data source
   */
  async removeDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      return;
    }
    
    // Disconnect if connected
    if (dataSource.isConnected()) {
      await dataSource.disconnect();
    }
    
    // Remove from health monitor
    this.healthMonitor.removeDataSource(id);
    
    // Remove from our map
    this.dataSources.delete(id);
  }
  
  /**
   * Enable a data source
   */
  async enableDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source ${id} not found`);
    }
    
    // Connect if we're running
    if (this.running && !dataSource.isConnected()) {
      try {
        await dataSource.connect();
      } catch (error) {
        console.error(`Failed to connect to data source ${id}:`, error);
      }
    }
  }
  
  /**
   * Disable a data source
   */
  async disableDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source ${id} not found`);
    }
    
    // Disconnect if connected
    if (dataSource.isConnected()) {
      await dataSource.disconnect();
    }
  }
  
  /**
   * Register a transaction processor
   */
  registerProcessor(processor: TransactionProcessor): void {
    this.processors.add(processor);
  }
  
  /**
   * Unregister a transaction processor
   */
  unregisterProcessor(processor: TransactionProcessor): void {
    this.processors.delete(processor);
  }
  
  /**
   * Initialize data sources from config
   */
  private async initializeDataSources(): Promise<void> {
    for (const sourceConfig of this.config.dataSources) {
      if (sourceConfig.enabled) {
        try {
          // Create data source
          await this.addDataSource(sourceConfig);
        } catch (error) {
          console.error(`Failed to initialize data source ${sourceConfig.id}:`, error);
          this.addError({
            timestamp: new Date(),
            message: `Failed to initialize data source: ${error}`,
            dataSourceId: sourceConfig.id,
            isRecoverable: true
          });
        }
      }
    }
  }
  
  /**
   * Create a data source based on its type
   */
  private createDataSource(config: DataSourceConfig): DataSource {
    switch (config.type) {
      case DataSourceType.RPC:
        return new RpcDataSource(config);
      // Implement other data source types as needed
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }
  
  /**
   * Start live ingestion mode
   */
  private async startLiveIngestion(): Promise<void> {
    // Connect to all data sources
    await this.connectToDataSources();
    
    // Start polling for new slots
    this.startPolling();
    
    // Subscribe to transaction notifications from high priority sources
    await this.subscribeToTransactions();
  }
  
  /**
   * Start backfill ingestion mode
   */
  private async startBackfillIngestion(): Promise<void> {
    // Connect to all data sources
    await this.connectToDataSources();
    
    // Queue the slots for backfilling
    if (this.config.startSlot !== undefined && this.config.endSlot !== undefined) {
      this.backfillQueue.addSlotRange(this.config.startSlot, this.config.endSlot, 10);
    }
    
    // Start polling to check progress
    this.startPolling();
  }
  
  /**
   * Start batch ingestion mode
   */
  private async startBatchIngestion(): Promise<void> {
    // Connect to all data sources
    await this.connectToDataSources();
    
    // Queue the slots for processing
    if (this.config.startSlot !== undefined && this.config.endSlot !== undefined) {
      this.backfillQueue.addSlotRange(this.config.startSlot, this.config.endSlot, 5);
    }
    
    // We don't poll in batch mode, just let the backfill queue process everything
  }
  
  /**
   * Connect to all data sources
   */
  private async connectToDataSources(): Promise<void> {
    const connectPromises = Array.from(this.dataSources.values())
      .filter(ds => !ds.isConnected())
      .map(async (dataSource) => {
        try {
          await dataSource.connect();
        } catch (error) {
          console.error(`Failed to connect to data source ${dataSource.id}:`, error);
        }
      });
    
    await Promise.all(connectPromises);
  }
  
  /**
   * Start polling for new slots
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    const interval = this.config.pollingInterval || 5000; // Default to 5 seconds
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForNewSlots();
      } catch (error) {
        console.error('Error polling for new slots:', error);
      }
    }, interval);
  }
  
  /**
   * Poll for new slots
   */
  private async pollForNewSlots(): Promise<void> {
    // Get healthy data sources
    const healthySources = this.getHealthyDataSourcesByPriority();
    if (healthySources.length === 0) {
      console.warn('No healthy data sources available for polling');
      return;
    }
    
    // Use highest priority source first
    const primarySource = healthySources[0];
    this.status.activeDataSourceId = primarySource.id;
    
    try {
      // Get current slot
      const currentSlot = await primarySource.getSlot();
      this.status.currentSlot = currentSlot;
      
      // Check for slot gaps
      if (this.slotGapDetectionEnabled && this.lastProcessedSlot > 0) {
        // If there's a gap, add those slots to the backfill queue
        if (currentSlot > this.lastProcessedSlot + 1) {
          const missedSlots = currentSlot - this.lastProcessedSlot - 1;
          console.log(`Detected ${missedSlots} missed slots, adding to backfill queue`);
          
          // Add missed slots to backfill queue
          this.backfillQueue.addSlotRange(this.lastProcessedSlot + 1, currentSlot - 1, 5);
        }
      }
      
      // Update last processed slot
      this.lastProcessedSlot = currentSlot;
      this.status.lastProcessedSlot = currentSlot;
      
    } catch (error) {
      console.error(`Error getting slot from primary source ${primarySource.id}:`, error);
      
      // Try other sources
      for (let i = 1; i < healthySources.length; i++) {
        try {
          const backupSource = healthySources[i];
          const currentSlot = await backupSource.getSlot();
          
          console.log(`Using backup source ${backupSource.id} for slot polling`);
          this.status.activeDataSourceId = backupSource.id;
          this.status.currentSlot = currentSlot;
          
          // Update last processed slot
          this.lastProcessedSlot = currentSlot;
          this.status.lastProcessedSlot = currentSlot;
          
          break;
        } catch (backupError) {
          console.error(`Error getting slot from backup source: ${backupError}`);
        }
      }
    }
    
    this.status.lastUpdate = new Date();
  }
  
  /**
   * Subscribe to transaction notifications
   */
  private async subscribeToTransactions(): Promise<void> {
    // Get healthy sources ordered by priority
    const healthySources = this.getHealthyDataSourcesByPriority();
    if (healthySources.length === 0) {
      console.warn('No healthy data sources available for subscriptions');
      return;
    }
    
    // Subscribe to transactions from top sources (can use multiple for redundancy)
    const topSources = healthySources.slice(0, 2); // Use top 2 sources
    
    for (const source of topSources) {
      try {
        const subscriptionId = await source.subscribeToTransactions(
          async (transaction) => {
            await this.processTransaction(transaction);
          }
        );
        
        this.subscriptions.set(source.id, subscriptionId);
        console.log(`Subscribed to transactions from ${source.id}`);
      } catch (error) {
        console.error(`Error subscribing to transactions from ${source.id}:`, error);
      }
    }
  }
  
  /**
   * Unsubscribe from all transaction notifications
   */
  private async unsubscribeAll(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.entries())
      .map(async ([sourceId, subscriptionId]) => {
        try {
          const source = this.dataSources.get(sourceId);
          if (source) {
            await source.unsubscribeFromTransactions(subscriptionId);
          }
        } catch (error) {
          console.error(`Error unsubscribing from ${sourceId}:`, error);
        }
      });
    
    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
  }
  
  /**
   * Process a transaction
   */
  private async processTransaction(transaction: RawTransactionData): Promise<void> {
    try {
      // Store the transaction in our storage
      await this.storeTransaction(transaction);
      
      // Process with all registered processors
      for (const processor of Array.from(this.processors)) {
        try {
          await processor.processTransaction(transaction);
        } catch (processorError) {
          console.error(`Error in transaction processor:`, processorError);
        }
      }
      
      // Update stats
      this.status.itemsProcessed++;
      this.status.lastProcessedTimestamp = new Date();
      
      // Mark as processed in backfill queue
      this.backfillQueue.markTransactionProcessed(transaction.signature);
      
      // If this transaction has a slot, update our last processed slot
      if (transaction.slot && transaction.slot > this.lastProcessedSlot) {
        this.lastProcessedSlot = transaction.slot;
        this.status.lastProcessedSlot = transaction.slot;
      }
      
    } catch (error) {
      console.error(`Error processing transaction ${transaction.signature}:`, error);
      
      // Add to backfill queue for retry
      this.backfillQueue.addTransaction(transaction.signature, transaction.slot, 3);
    }
  }
  
  /**
   * Store a transaction in the storage system
   */
  private async storeTransaction(transaction: RawTransactionData): Promise<void> {
    try {
      // Store in time series database
      await this.storage.timeSeries.insert('transactions', {
        timestamp: new Date(transaction.timestamp ? transaction.timestamp * 1000 : Date.now()),
        data: {
          signature: transaction.signature,
          slot: transaction.slot,
          success: transaction.rawData.meta?.err === null,
          fee: transaction.rawData.meta?.fee || 0,
        },
        tags: {
          signature: transaction.signature,
          slot: transaction.slot
        }
      });
      
      // Graph DB storage would be more complex and depend on your data model
      // Here you would extract accounts, instructions, etc. and create nodes/edges
      
    } catch (error) {
      console.error(`Error storing transaction:`, error);
      throw error;
    }
  }
  
  /**
   * Get healthy data sources sorted by priority
   */
  private getHealthyDataSourcesByPriority(): DataSource[] {
    return Array.from(this.dataSources.values())
      .filter(ds => {
        const status = this.healthMonitor.getDataSourceHealth(ds.id);
        return status === HealthStatus.HEALTHY || status === HealthStatus.DEGRADED;
      })
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Add an error to the status
   */
  private addError(error: IngestionError): void {
    this.status.errors.push(error);
    
    // Limit error history
    if (this.status.errors.length > 100) {
      this.status.errors.shift();
    }
  }
  
  /**
   * Set up event handlers for the backfill queue
   */
  private setupBackfillEventHandlers(): void {
    this.backfillQueue.on('slotProcessedSuccessfully', (slot) => {
      console.log(`Backfill: Processed slot ${slot}`);
    });
    
    this.backfillQueue.on('transactionProcessedSuccessfully', (signature) => {
      // For high volume, we might want to limit logging
      if (Math.random() < 0.01) { // Log about 1% of transactions
        console.log(`Backfill: Processed transaction ${signature}`);
      }
    });
    
    this.backfillQueue.on('itemFailed', (item) => {
      console.error(`Backfill: Item ${item.id} failed after ${item.attempts} attempts`);
      
      this.addError({
        timestamp: new Date(),
        message: `Backfill item ${item.id} failed after ${item.attempts} attempts`,
        dataSourceId: 'backfill',
        isRecoverable: false
      });
    });
    
    this.backfillQueue.on('error', (error) => {
      console.error(`Backfill error:`, error);
      
      this.addError({
        timestamp: new Date(),
        message: `Backfill error: ${error.message || 'Unknown error'}`,
        dataSourceId: 'backfill',
        isRecoverable: true
      });
    });
  }
} 