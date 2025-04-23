/**
 * Types for the Solana network health monitoring system
 */

export enum NetworkStatus {
  OPTIMAL = 'optimal',
  DEGRADED = 'degraded',
  CONGESTED = 'congested',
  OUTAGE = 'outage'
}

export enum ValidatorHealth {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  OFFLINE = 'offline'
}

export interface NetworkHealthData {
  status: NetworkStatus;
  tps: number; // transactions per second
  blockHeight: number;
  slotHeight: number;
  validatorCount: number;
  validatorHealthDistribution: {
    [ValidatorHealth.HEALTHY]: number;
    [ValidatorHealth.WARNING]: number;
    [ValidatorHealth.CRITICAL]: number;
    [ValidatorHealth.OFFLINE]: number;
  };
  averageBlockTime: number; // milliseconds
  outageDetected: boolean;
  timeOfLastUpdate: Date;
}

export interface HealthAlert {
  id: string;
  timestamp: Date;
  type: 'warning' | 'critical' | 'recovery';
  message: string;
  networkStatus: NetworkStatus;
  data?: any;
}

export interface HealthHistoryEntry {
  timestamp: Date;
  status: NetworkStatus;
  tps: number;
  validatorHealthSummary: {
    [ValidatorHealth.HEALTHY]: number;
    [ValidatorHealth.WARNING]: number;
    [ValidatorHealth.CRITICAL]: number;
    [ValidatorHealth.OFFLINE]: number;
  };
}

export interface HealthMonitorConfig {
  statusEndpoint: string;
  validatorEndpoints: string[];
  pollingInterval: number; // milliseconds
  alertThresholds: {
    tpsLow: number;
    validatorOfflinePercentage: number;
    blockTimeIncreaseFactor: number;
  };
}

// Observer pattern interfaces
export interface HealthStatusListener {
  onStatusUpdate(healthData: NetworkHealthData): void;
  onAlert(alert: HealthAlert): void;
}

export interface HealthStatusObservable {
  addListener(listener: HealthStatusListener): void;
  removeListener(listener: HealthStatusListener): void;
  notifyStatusUpdate(healthData: NetworkHealthData): void;
  notifyAlert(alert: HealthAlert): void;
} 