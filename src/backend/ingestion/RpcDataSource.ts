import { 
  Connection, 
  ConfirmedTransaction, 
  PublicKey,
  ConfirmedSignatureInfo,
  TransactionSignature,
  Commitment
} from '@solana/web3.js';
import { 
  DataSource, 
  DataSourceType, 
  DataSourceConfig,
  RawTransactionData
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Implementation of a Solana RPC node data source
 * This connects to a Solana RPC endpoint to fetch transaction data
 */
export class RpcDataSource implements DataSource {
  readonly id: string;
  readonly type: DataSourceType;
  readonly priority: number;
  readonly endpoint: string;
  
  private connection: Connection | null = null;
  private connected: boolean = false;
  private subscriptions: Map<number, number> = new Map();
  private requestCounter: { [key: string]: number } = {
    perSecond: 0,
    perMinute: 0,
    perHour: 0
  };
  private lastRequestTime: Date = new Date();
  private rateLimits?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  private retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    backoffMultiplier: number;
  };
  private timeout?: number;
  private lastError: Error | null = null;
  private lastActivity: Date = new Date();
  private retryCount: number = 0;
  
  constructor(config: DataSourceConfig) {
    this.id = config.id;
    this.type = config.type;
    this.priority = config.priority;
    this.endpoint = config.endpoint;
    this.rateLimits = config.rateLimits;
    this.retryConfig = config.retryConfig;
    this.timeout = config.timeout || 30000; // Default 30s timeout
    
    // Reset rate limit counters every minute and hour
    setInterval(() => {
      this.requestCounter.perSecond = 0;
    }, 1000);
    
    setInterval(() => {
      this.requestCounter.perMinute = 0;
    }, 60000);
    
    setInterval(() => {
      this.requestCounter.perHour = 0;
    }, 3600000);
  }
  
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    try {
      const connectionConfig = {
        commitment: 'confirmed' as Commitment,
        disableRetryOnRateLimit: false,
        confirmTransactionInitialTimeout: this.timeout
      };
      
      this.connection = new Connection(this.endpoint, connectionConfig);
      
      // Test the connection
      await this.connection.getVersion();
      
      this.connected = true;
      this.lastActivity = new Date();
      this.retryCount = 0;
      console.log(`Connected to RPC endpoint: ${this.endpoint}`);
    } catch (error) {
      this.connected = false;
      this.lastError = error as Error;
      console.error(`Failed to connect to RPC endpoint ${this.endpoint}:`, error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    // Unsubscribe from all active subscriptions
    const subscriptionEntries = Array.from(this.subscriptions.entries());
    for (const [id, subscriptionId] of subscriptionEntries) {
      await this.unsubscribeFromTransactions(id);
    }
    
    this.connected = false;
    this.connection = null;
    console.log(`Disconnected from RPC endpoint: ${this.endpoint}`);
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async getSlot(): Promise<number> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RPC endpoint: ${this.endpoint}`);
    }
    
    await this.checkRateLimits();
    
    try {
      this.lastActivity = new Date();
      return await this.executeWithRetry(() => this.connection!.getSlot('confirmed'));
    } catch (error) {
      this.lastError = error as Error;
      console.error(`Error getting slot from ${this.endpoint}:`, error);
      throw error;
    }
  }
  
  async getTransaction(signature: string): Promise<RawTransactionData | null> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RPC endpoint: ${this.endpoint}`);
    }
    
    await this.checkRateLimits();
    
    try {
      this.lastActivity = new Date();
      
      const transaction = await this.executeWithRetry(() => 
        this.connection!.getTransaction(signature, { maxSupportedTransactionVersion: 0 })
      );
      
      if (!transaction) {
        return null;
      }
      
      return {
        signature,
        slot: transaction.slot,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : undefined,
        rawData: transaction
      };
    } catch (error) {
      this.lastError = error as Error;
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  async getTransactionsBySlot(slot: number): Promise<RawTransactionData[]> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RPC endpoint: ${this.endpoint}`);
    }
    
    await this.checkRateLimits();
    
    try {
      this.lastActivity = new Date();
      
      // First, get confirmed blocks
      const blockhash = await this.executeWithRetry(() => 
        this.connection!.getBlockHeight('confirmed')
      );
      
      // Get transactions in that block/slot
      const transactions = await this.executeWithRetry(() => 
        this.connection!.getBlock(slot, { maxSupportedTransactionVersion: 0 })
      );
      
      if (!transactions || !transactions.transactions) {
        return [];
      }
      
      return transactions.transactions.map((tx, index) => {
        const signature = tx.transaction.signatures[0] || '';
        return {
          signature,
          slot,
          timestamp: transactions.blockTime ? transactions.blockTime * 1000 : undefined,
          rawData: tx
        };
      });
    } catch (error) {
      this.lastError = error as Error;
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  async getTransactionsByAccount(account: string, limit: number = 10): Promise<RawTransactionData[]> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RPC endpoint: ${this.endpoint}`);
    }
    
    await this.checkRateLimits();
    
    try {
      this.lastActivity = new Date();
      
      const publicKey = new PublicKey(account);
      
      // Get signatures for address
      const signatures = await this.executeWithRetry(() => 
        this.connection!.getSignaturesForAddress(publicKey, { limit })
      );
      
      if (!signatures || signatures.length === 0) {
        return [];
      }
      
      // Get the actual transactions
      const transactions: RawTransactionData[] = [];
      
      for (const sig of signatures) {
        const tx = await this.getTransaction(sig.signature);
        if (tx) {
          transactions.push(tx);
        }
      }
      
      return transactions;
    } catch (error) {
      this.lastError = error as Error;
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  async subscribeToTransactions(callback: (transaction: RawTransactionData) => void): Promise<number> {
    if (!this.connected || !this.connection) {
      throw new Error(`Not connected to RPC endpoint: ${this.endpoint}`);
    }
    
    try {
      this.lastActivity = new Date();
      
      // Subscribe to transaction confirmation
      const subscriptionId = this.connection.onSignature(
        'placeholder', // We'll update this for each transaction
        (result, context) => {
          // This is just a placeholder - we'll use other methods to get transactions
          console.log(`Subscription received transaction confirmation`);
        },
        'confirmed'
      );
      
      // Generate a local ID to track this subscription
      const localId = Date.now();
      this.subscriptions.set(localId, subscriptionId);
      
      return localId;
    } catch (error) {
      this.lastError = error as Error;
      this.handleConnectionError(error);
      throw error;
    }
  }
  
  async unsubscribeFromTransactions(localId: number): Promise<void> {
    if (!this.connected || !this.connection) {
      return;
    }
    
    try {
      const subscriptionId = this.subscriptions.get(localId);
      if (subscriptionId) {
        await this.connection.removeSignatureListener(subscriptionId);
        this.subscriptions.delete(localId);
      }
    } catch (error) {
      console.error(`Error unsubscribing from transactions from ${this.endpoint}:`, error);
    }
  }
  
  async healthCheck(): Promise<boolean> {
    if (!this.connection) {
      return false;
    }
    
    try {
      // Simple health check - see if we can get the current version
      const version = await this.connection.getVersion();
      return !!version;
    } catch (error) {
      this.connected = false;
      this.lastError = error as Error;
      console.error(`Health check failed for ${this.endpoint}:`, error);
      return false;
    }
  }
  
  private async checkRateLimits(): Promise<void> {
    if (!this.rateLimits) {
      return;
    }
    
    // Increment counters
    this.requestCounter.perSecond++;
    this.requestCounter.perMinute++;
    this.requestCounter.perHour++;
    
    // Check if we're exceeding rate limits
    if (this.requestCounter.perSecond > this.rateLimits.maxRequestsPerSecond ||
        this.requestCounter.perMinute > this.rateLimits.maxRequestsPerMinute ||
        this.requestCounter.perHour > this.rateLimits.maxRequestsPerHour) {
      
      // Calculate how long to wait
      const now = new Date();
      const timeSinceLastRequest = now.getTime() - this.lastRequestTime.getTime();
      
      // Wait at least 1 second if we've hit the per-second limit
      if (this.requestCounter.perSecond > this.rateLimits.maxRequestsPerSecond) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Record this request time for future rate limiting
      this.lastRequestTime = new Date();
    }
  }
  
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.retryConfig) {
      return operation();
    }
    
    let retries = 0;
    let delay = this.retryConfig.initialDelayMs;
    
    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        // If it's a rate limit error or a network error, retry
        const isRateLimitError = error.toString().includes('429') || 
                                error.toString().includes('rate limit');
        const isNetworkError = error.toString().includes('ECONNREFUSED') || 
                              error.toString().includes('ETIMEDOUT');
        
        if ((isRateLimitError || isNetworkError) && retries < this.retryConfig.maxRetries) {
          retries++;
          
          console.warn(`Request to ${this.endpoint} failed (retry ${retries}/${this.retryConfig.maxRetries}): ${error.message}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Increase delay for next retry
          delay *= this.retryConfig.backoffMultiplier;
          continue;
        }
        
        throw error;
      }
    }
  }
  
  private handleConnectionError(error: any): void {
    this.retryCount++;
    
    // If we exceed max retries, mark as disconnected
    if (this.retryConfig && this.retryCount >= this.retryConfig.maxRetries) {
      this.connected = false;
      console.error(`RPC Data Source [${this.id}] marked as disconnected after ${this.retryCount} failed retries`);
    }
    
    // Log the error
    console.error(`RPC Data Source [${this.id}] error: ${error}`);
  }
} 