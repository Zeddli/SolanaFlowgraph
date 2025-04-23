/**
 * Types for the Solana data ingestion system
 */

import { Connection } from '@solana/web3.js';
import { NetworkStatus } from '../health-monitor/types';
import { HybridStorage } from '../storage/types';

export enum DataSourceType {
  RPC = 'rpc',
  WEBSOCKET = 'websocket',
  ARCHIVAL = 'archival',
  EXTERNAL_API = 'external_api',
  EXCEL = 'excel',
  MOCK = 'mock'
}

export enum IngestionMode {
  LIVE = 'live',
  BACKFILL = 'backfill',
  BATCH = 'batch'
}

export interface DataSourceConfig {
  id: string;
  type: DataSourceType;
  priority: number; // Higher number = higher priority
  endpoint: string;
  credentials?: {
    apiKey?: string;
    secret?: string;
    token?: string;
  };
  rateLimits?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  timeout?: number; // in milliseconds
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    backoffMultiplier: number;
  };
  enabled: boolean;
}

export interface IngestionConfig {
  mode: IngestionMode;
  dataSources: DataSourceConfig[];
  fallbackStrategy: 'sequential' | 'parallel';
  batchSize?: number;
  startSlot?: number;
  endSlot?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  pollingInterval?: number; // in milliseconds
  subscriptionTopics?: string[];
}

export interface IngestionStatus {
  mode: IngestionMode;
  activeDataSourceId: string;
  currentSlot?: number;
  lastProcessedSlot?: number;
  currentTimestamp?: Date;
  lastProcessedTimestamp?: Date;
  itemsProcessed: number;
  itemsQueued: number;
  errors: IngestionError[];
  warnings: string[];
  networkStatus: NetworkStatus;
  startTime: Date;
  lastUpdate: Date;
}

export interface IngestionError {
  timestamp: Date;
  message: string;
  dataSourceId: string;
  code?: string;
  context?: any;
  isRecoverable: boolean;
}

export interface RawTransactionData {
  signature: string;
  slot: number;
  timestamp?: number;
  rawData: any;
}

export interface TransactionProcessor {
  processTransaction(transaction: RawTransactionData): Promise<void>;
}

export interface DataSource {
  readonly id: string;
  readonly type: DataSourceType;
  readonly priority: number;
  readonly endpoint: string;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  getSlot(): Promise<number>;
  getTransaction(signature: string): Promise<RawTransactionData | null>;
  getTransactionsBySlot(slot: number): Promise<RawTransactionData[]>;
  getTransactionsByAccount(account: string, limit?: number): Promise<RawTransactionData[]>;
  
  subscribeToTransactions(callback: (transaction: RawTransactionData) => void): Promise<number>;
  unsubscribeFromTransactions(subscriptionId: number): Promise<void>;
  
  healthCheck(): Promise<boolean>;
}

export interface IngestionService {
  initialize(config: IngestionConfig, storage: HybridStorage): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getStatus(): IngestionStatus;
  
  addDataSource(config: DataSourceConfig): Promise<void>;
  removeDataSource(id: string): Promise<void>;
  enableDataSource(id: string): Promise<void>;
  disableDataSource(id: string): Promise<void>;
  
  registerProcessor(processor: TransactionProcessor): void;
  unregisterProcessor(processor: TransactionProcessor): void;
}

/**
 * Represents a range of slots to process
 */
export interface SlotRange {
  /** Starting slot (inclusive) */
  fromSlot: number;
  /** Ending slot (inclusive) */
  toSlot: number;
}

/**
 * Transaction data structure 
 */
export interface TransactionData {
  /** Transaction signature */
  signature: string;
  /** Slot number where the transaction was processed */
  slot: number;
  /** Block time (Unix timestamp) */
  blockTime: number;
  /** Raw transaction data */
  rawData: any;
  /** Any additional transaction data */
  [key: string]: any;
}

/**
 * Ingestion record for a transaction or other data point
 */
export interface IngestionRecord {
  /** Transaction signature or unique identifier */
  signature: string;
  /** Slot number where this data was processed */
  slot: number;
  /** Block time if available */
  blockTime?: number;
  /** Source that provided this data */
  source: string;
  /** When this record was ingested */
  timestamp: Date;
  /** Status of this ingestion record */
  status: 'pending' | 'processed' | 'backfilled' | 'failed';
  /** The actual data payload */
  data: TransactionData;
  /** Error message if failed */
  error?: string;
} 