import { Connection } from '@solana/web3.js';
import {
  NetworkStatus,
  ValidatorHealth,
  NetworkHealthData,
  HealthAlert,
  HealthStatusListener,
  HealthStatusObservable,
  HealthMonitorConfig
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Solana Health Monitor Service
 * 
 * This service monitors the health of the Solana network by:
 * 1. Checking RPC endpoints for response time and availability
 * 2. Monitoring transaction throughput and validator performance
 * 3. Tracking network status changes and alerting on significant events
 * 4. Maintaining historical health data for trend analysis
 */
export class SolanaHealthMonitor implements HealthStatusObservable {
  private listeners: HealthStatusListener[] = [];
  private config: HealthMonitorConfig;
  private currentHealth: NetworkHealthData;
  private intervalId: NodeJS.Timeout | null = null;
  private connections: Connection[] = [];
  private healthHistory: NetworkHealthData[] = [];
  private readonly MAX_HISTORY_ITEMS = 1000;
  
  constructor(config: HealthMonitorConfig) {
    this.config = config;
    this.currentHealth = this.createDefaultHealthData();
    
    // Initialize connections to the validator endpoints
    this.initializeConnections();
  }
  
  /**
   * Start the health monitoring service
   */
  public start(): void {
    if (this.intervalId) {
      return; // Already running
    }
    
    console.log('Starting Solana Health Monitor...');
    
    // Begin polling for health data
    this.intervalId = setInterval(async () => {
      try {
        await this.checkNetworkHealth();
      } catch (error) {
        console.error('Error checking network health:', error);
        this.handleMonitoringError(error);
      }
    }, this.config.pollingInterval);
    
    // Perform initial health check
    this.checkNetworkHealth().catch(error => {
      console.error('Error during initial health check:', error);
      this.handleMonitoringError(error);
    });
  }
  
  /**
   * Stop the health monitoring service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Solana Health Monitor stopped');
    }
  }
  
  /**
   * Add a listener to be notified of health status changes
   */
  public addListener(listener: HealthStatusListener): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove a health status listener
   */
  public removeListener(listener: HealthStatusListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Notify all listeners of a health status update
   */
  public notifyStatusUpdate(healthData: NetworkHealthData): void {
    this.listeners.forEach(listener => {
      try {
        listener.onStatusUpdate(healthData);
      } catch (error) {
        console.error('Error notifying listener of status update:', error);
      }
    });
  }
  
  /**
   * Notify all listeners of a health alert
   */
  public notifyAlert(alert: HealthAlert): void {
    this.listeners.forEach(listener => {
      try {
        listener.onAlert(alert);
      } catch (error) {
        console.error('Error notifying listener of alert:', error);
      }
    });
  }
  
  /**
   * Get the current network health data
   */
  public getCurrentHealth(): NetworkHealthData {
    return { ...this.currentHealth };
  }
  
  /**
   * Get historical health data
   */
  public getHealthHistory(limit: number = 100): NetworkHealthData[] {
    const historyCount = Math.min(limit, this.healthHistory.length);
    return this.healthHistory.slice(-historyCount);
  }
  
  // PRIVATE METHODS
  
  private initializeConnections(): void {
    this.connections = this.config.validatorEndpoints.map(
      endpoint => new Connection(endpoint)
    );
  }
  
  private async checkNetworkHealth(): Promise<void> {
    // In a real implementation, we would query multiple Solana validators
    // Here we'll simulate network health by generating mock data
    const newHealth = await this.simulateNetworkHealth();
    
    // Compare with previous status to detect changes
    const statusChanged = this.currentHealth.status !== newHealth.status;
    const wasOutage = this.currentHealth.outageDetected;
    const isOutage = newHealth.outageDetected;
    
    // Store the new health data
    this.currentHealth = newHealth;
    
    // Add to history (limiting the size)
    this.healthHistory.push(newHealth);
    if (this.healthHistory.length > this.MAX_HISTORY_ITEMS) {
      this.healthHistory.shift();
    }
    
    // Notify listeners of the health update
    this.notifyStatusUpdate(newHealth);
    
    // Generate appropriate alerts for status changes
    if (statusChanged) {
      const alertType = this.determineAlertType(newHealth.status);
      const alert: HealthAlert = {
        id: uuidv4(),
        timestamp: new Date(),
        type: alertType,
        message: this.generateAlertMessage(newHealth.status),
        networkStatus: newHealth.status,
        data: {
          previousStatus: this.currentHealth.status,
          tps: newHealth.tps,
          validatorStats: newHealth.validatorHealthDistribution
        }
      };
      
      this.notifyAlert(alert);
    }
    
    // Special handling for outage recovery
    if (wasOutage && !isOutage) {
      const recoveryAlert: HealthAlert = {
        id: uuidv4(),
        timestamp: new Date(),
        type: 'recovery',
        message: 'Solana network has recovered from outage',
        networkStatus: newHealth.status,
        data: {
          downtime: this.calculateDowntime()
        }
      };
      
      this.notifyAlert(recoveryAlert);
    }
  }
  
  private async simulateNetworkHealth(): Promise<NetworkHealthData> {
    // In a real implementation, this would query actual Solana validators
    // For simulation, we'll generate realistic but mock data
    
    // Generate health values with some randomness to simulate network fluctuations
    const rand = Math.random();
    let status: NetworkStatus;
    let tps: number;
    let validatorDistribution: Record<ValidatorHealth, number>;
    let outageDetected = false;
    
    // Simulate different network conditions
    if (rand > 0.97) {
      // Rare outage simulation (3% chance)
      status = NetworkStatus.OUTAGE;
      tps = Math.random() * 100; // Very low TPS during outage
      outageDetected = true;
      validatorDistribution = {
        [ValidatorHealth.HEALTHY]: Math.floor(Math.random() * 10),
        [ValidatorHealth.WARNING]: Math.floor(Math.random() * 20),
        [ValidatorHealth.CRITICAL]: Math.floor(Math.random() * 50),
        [ValidatorHealth.OFFLINE]: Math.floor(Math.random() * 100) + 100
      };
    } else if (rand > 0.85) {
      // Congestion simulation (12% chance)
      status = NetworkStatus.CONGESTED;
      tps = 1000 + Math.random() * 3000;
      validatorDistribution = {
        [ValidatorHealth.HEALTHY]: Math.floor(Math.random() * 100) + 50,
        [ValidatorHealth.WARNING]: Math.floor(Math.random() * 50) + 10,
        [ValidatorHealth.CRITICAL]: Math.floor(Math.random() * 20) + 5,
        [ValidatorHealth.OFFLINE]: Math.floor(Math.random() * 10)
      };
    } else if (rand > 0.6) {
      // Degraded simulation (25% chance)
      status = NetworkStatus.DEGRADED;
      tps = 3000 + Math.random() * 1000;
      validatorDistribution = {
        [ValidatorHealth.HEALTHY]: Math.floor(Math.random() * 100) + 100,
        [ValidatorHealth.WARNING]: Math.floor(Math.random() * 30) + 5,
        [ValidatorHealth.CRITICAL]: Math.floor(Math.random() * 10),
        [ValidatorHealth.OFFLINE]: Math.floor(Math.random() * 5)
      };
    } else {
      // Optimal simulation (60% chance)
      status = NetworkStatus.OPTIMAL;
      tps = 3500 + Math.random() * 1500;
      validatorDistribution = {
        [ValidatorHealth.HEALTHY]: Math.floor(Math.random() * 100) + 150,
        [ValidatorHealth.WARNING]: Math.floor(Math.random() * 20),
        [ValidatorHealth.CRITICAL]: Math.floor(Math.random() * 5),
        [ValidatorHealth.OFFLINE]: Math.floor(Math.random() * 3)
      };
    }
    
    const totalValidators = Object.values(validatorDistribution).reduce((a, b) => a + b, 0);
    
    // Create and return the health data
    return {
      status,
      tps,
      blockHeight: this.currentHealth.blockHeight + Math.floor(Math.random() * 10) + 1,
      slotHeight: this.currentHealth.slotHeight + Math.floor(Math.random() * 20) + 5,
      validatorCount: totalValidators,
      validatorHealthDistribution: validatorDistribution,
      averageBlockTime: status === NetworkStatus.OPTIMAL 
        ? 400 + Math.random() * 200 
        : 600 + Math.random() * 1000,
      outageDetected,
      timeOfLastUpdate: new Date()
    };
  }
  
  private handleMonitoringError(error: any): void {
    // Log the error and create an alert
    console.error('Health monitoring error:', error);
    
    // If we can't monitor the network, assume it might be in a degraded state
    this.currentHealth.status = NetworkStatus.DEGRADED;
    this.currentHealth.timeOfLastUpdate = new Date();
    
    // Create an alert for the monitoring error
    const errorAlert: HealthAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'warning',
      message: `Health monitoring error: ${error.message || 'Unknown error'}`,
      networkStatus: this.currentHealth.status,
      data: { error }
    };
    
    this.notifyAlert(errorAlert);
  }
  
  private determineAlertType(status: NetworkStatus): 'warning' | 'critical' | 'recovery' {
    switch (status) {
      case NetworkStatus.OUTAGE:
        return 'critical';
      case NetworkStatus.CONGESTED:
      case NetworkStatus.DEGRADED:
        return 'warning';
      case NetworkStatus.OPTIMAL:
        return 'recovery';
      default:
        return 'warning';
    }
  }
  
  private generateAlertMessage(status: NetworkStatus): string {
    switch (status) {
      case NetworkStatus.OUTAGE:
        return 'CRITICAL: Solana network outage detected';
      case NetworkStatus.CONGESTED:
        return 'WARNING: Solana network is congested';
      case NetworkStatus.DEGRADED:
        return 'WARNING: Solana network performance is degraded';
      case NetworkStatus.OPTIMAL:
        return 'INFO: Solana network performance has returned to optimal';
      default:
        return `Solana network status change: ${status}`;
    }
  }
  
  private calculateDowntime(): number {
    // In a real implementation, this would calculate the duration of the outage
    // For now, we'll return a random duration
    return Math.floor(Math.random() * 600) + 10; // 10-610 seconds
  }
  
  private createDefaultHealthData(): NetworkHealthData {
    return {
      status: NetworkStatus.OPTIMAL,
      tps: 4000,
      blockHeight: 150000000,
      slotHeight: 200000000,
      validatorCount: 200,
      validatorHealthDistribution: {
        [ValidatorHealth.HEALTHY]: 180,
        [ValidatorHealth.WARNING]: 15,
        [ValidatorHealth.CRITICAL]: 3,
        [ValidatorHealth.OFFLINE]: 2
      },
      averageBlockTime: 500, // milliseconds
      outageDetected: false,
      timeOfLastUpdate: new Date()
    };
  }
} 