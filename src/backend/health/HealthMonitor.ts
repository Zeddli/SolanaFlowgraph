import { DataSource, DataSourceType } from '../ingestion/types';
import { EventEmitter } from 'events';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface HealthMetrics {
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  consecutiveFailures: number;
  uptime: number;
  dataSources: {
    [id: string]: {
      status: HealthStatus;
      priority: number;
      lastActive: Date;
      errorCount: number;
    }
  }
}

/**
 * The HealthMonitor tracks the health of connected Solana data sources
 * and provides metrics about the overall system health.
 */
export class HealthMonitor extends EventEmitter {
  private dataSources: Map<string, DataSource> = new Map();
  private metrics: HealthMetrics;
  private checkInterval: NodeJS.Timeout | null = null;
  private startTime: Date;
  
  // Configuration
  private healthCheckIntervalMs: number = 30000; // 30 seconds
  private maxConsecutiveFailures: number = 3;
  private degradedThreshold: number = 1; // Number of unhealthy sources before system is considered degraded
  private unhealthyThreshold: number = 2; // Number of unhealthy sources before system is considered unhealthy
  
  constructor() {
    super();
    this.startTime = new Date();
    this.metrics = {
      status: HealthStatus.UNKNOWN,
      responseTime: 0,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      uptime: 0,
      dataSources: {}
    };
  }
  
  /**
   * Add a data source to be monitored
   */
  addDataSource(dataSource: DataSource): void {
    this.dataSources.set(dataSource.id, dataSource);
    
    // Initialize metrics for this data source
    this.metrics.dataSources[dataSource.id] = {
      status: HealthStatus.UNKNOWN,
      priority: dataSource.priority,
      lastActive: new Date(),
      errorCount: 0
    };
    
    console.log(`Added data source ${dataSource.id} to health monitor`);
  }
  
  /**
   * Remove a data source from monitoring
   */
  removeDataSource(id: string): void {
    this.dataSources.delete(id);
    delete this.metrics.dataSources[id];
    console.log(`Removed data source ${id} from health monitor`);
  }
  
  /**
   * Start periodic health monitoring
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already running
    }
    
    this.checkInterval = setInterval(async () => {
      await this.checkHealth();
    }, this.healthCheckIntervalMs);
    
    console.log(`Health monitor started, checking every ${this.healthCheckIntervalMs / 1000} seconds`);
  }
  
  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Health monitor stopped');
  }
  
  /**
   * Check the health of all data sources
   */
  async checkHealth(): Promise<HealthMetrics> {
    const startTime = Date.now();
    let unhealthyCount = 0;
    
    // Check each data source
    Array.from(this.dataSources.entries()).forEach(async ([id, dataSource]) => {
      try {
        const isHealthy = await dataSource.healthCheck();
        
        if (isHealthy) {
          this.metrics.dataSources[id].status = HealthStatus.HEALTHY;
          this.metrics.dataSources[id].errorCount = 0;
        } else {
          this.metrics.dataSources[id].status = HealthStatus.UNHEALTHY;
          this.metrics.dataSources[id].errorCount++;
          unhealthyCount++;
        }
        
        this.metrics.dataSources[id].lastActive = new Date();
      } catch (error) {
        console.error(`Error checking health of data source ${id}: ${error}`);
        this.metrics.dataSources[id].status = HealthStatus.UNHEALTHY;
        this.metrics.dataSources[id].errorCount++;
        unhealthyCount++;
      }
    });
    
    // Calculate overall system health
    if (unhealthyCount === 0) {
      this.metrics.status = HealthStatus.HEALTHY;
      this.metrics.consecutiveFailures = 0;
    } else if (unhealthyCount >= this.unhealthyThreshold) {
      this.metrics.status = HealthStatus.UNHEALTHY;
      this.metrics.consecutiveFailures++;
      
      // Emit an event if the system is unhealthy
      this.emit('healthChange', this.metrics);
    } else if (unhealthyCount >= this.degradedThreshold) {
      this.metrics.status = HealthStatus.DEGRADED;
      this.emit('healthChange', this.metrics);
    }
    
    // Update metrics
    const endTime = Date.now();
    this.metrics.responseTime = endTime - startTime;
    this.metrics.lastChecked = new Date();
    this.metrics.uptime = (new Date().getTime() - this.startTime.getTime()) / 1000;
    
    return { ...this.metrics };
  }
  
  /**
   * Get the current health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get the health status of a specific data source
   */
  getDataSourceHealth(id: string): HealthStatus {
    if (!this.metrics.dataSources[id]) {
      return HealthStatus.UNKNOWN;
    }
    return this.metrics.dataSources[id].status;
  }
  
  /**
   * Get a sorted list of healthy data sources by priority
   */
  getHealthyDataSources(): DataSource[] {
    const healthySources: DataSource[] = [];
    
    Array.from(this.dataSources.entries()).forEach(([id, dataSource]) => {
      if (this.metrics.dataSources[id].status === HealthStatus.HEALTHY) {
        healthySources.push(dataSource);
      }
    });
    
    // Sort by priority (highest first)
    return healthySources.sort((a, b) => b.priority - a.priority);
  }
} 