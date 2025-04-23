import { HealthMonitor } from './health/HealthMonitor';
import { StorageManager } from './storage/StorageManager';
import { InMemoryHybridStorage } from './storage/InMemoryStorage';
import { IngestionService } from './ingestion/IngestionService';
import { 
  IngestionConfig, 
  IngestionMode, 
  DataSourceType,
  RawTransactionData,
  TransactionProcessor 
} from './ingestion/types';
import { TimeSeriesEntry, NodeType } from './storage/types';

/**
 * Simple transaction processor that extracts key information from transactions
 * and stores them for visualization
 */
class FlowgraphTransactionProcessor implements TransactionProcessor {
  private storage: InMemoryHybridStorage;
  private transactionsProcessed: number = 0;
  
  constructor(storage: InMemoryHybridStorage) {
    this.storage = storage;
  }
  
  async processTransaction(transaction: RawTransactionData): Promise<void> {
    try {
      console.log(`Processing transaction ${transaction.signature}`);
      
      // Extract basic transaction info
      const { signature, slot, timestamp } = transaction;
      const txData = transaction.rawData;
      
      // Store in time series database for historical queries
      const timeSeriesEntry: TimeSeriesEntry = {
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        data: {
          signature,
          slot,
          transaction: txData
        },
        tags: {
          signature,
          slot: slot.toString()
        }
      };
      
      await this.storage.timeSeries.insert('transactions', timeSeriesEntry);
      
      // Extract wallet addresses and program IDs for graph visualization
      if (txData && txData.transaction && txData.transaction.message) {
        const accountKeys = txData.transaction.message.accountKeys || [];
        const programIndices = txData.transaction.message.instructions?.map(
          (ix: any) => ix.programIdIndex
        ) || [];
        
        // Find program IDs and wallet addresses
        const programIds = programIndices.map((idx: number) => accountKeys[idx]?.toBase58?.() || accountKeys[idx]).filter(Boolean);
        const walletAddresses = accountKeys
          .filter((_: any, idx: number) => !programIndices.includes(idx))
          .map((key: any) => key?.toBase58?.() || key)
          .filter(Boolean);
        
        // Store wallet nodes
        for (const address of walletAddresses) {
          await this.storage.graph.createNode({
            id: address,
            type: NodeType.WALLET,
            properties: {
              address,
              lastSeen: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        // Store program nodes
        for (const programId of programIds) {
          await this.storage.graph.createNode({
            id: programId,
            type: NodeType.PROGRAM,
            properties: {
              address: programId,
              lastSeen: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        // Create edges between wallets and programs
        if (walletAddresses.length > 0 && programIds.length > 0) {
          for (const wallet of walletAddresses) {
            for (const program of programIds) {
              await this.storage.graph.createEdge({
                id: `${wallet}_${program}_${Date.now()}`,
                sourceId: wallet,
                targetId: program,
                type: 'interacts_with',
                properties: {
                  timestamp: new Date(),
                  transaction: signature
                },
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
      
      this.transactionsProcessed++;
      
      // Log progress periodically
      if (this.transactionsProcessed % 10 === 0) {
        console.log(`Processed ${this.transactionsProcessed} transactions`);
      }
    } catch (error) {
      console.error(`Error processing transaction ${transaction.signature}:`, error);
    }
  }
}

/**
 * Main application entry point for Solana FlowGraph
 */
async function startBackend() {
  try {
    console.log('Starting Solana FlowGraph Backend...');
    
    // Initialize components
    const healthMonitor = new HealthMonitor();
    const storage = new InMemoryHybridStorage();
    const storageManager = new StorageManager();
    
    // Register storage implementations
    storageManager.registerTimeSeriesStore('default', storage.timeSeries);
    storageManager.registerGraphStore('default', storage.graph);
    
    // Create ingestion service configuration
    const ingestionConfig: IngestionConfig = {
      mode: IngestionMode.LIVE,
      dataSources: [
        {
          id: 'devnet-primary',
          type: DataSourceType.RPC,
          priority: 10,
          endpoint: 'https://api.devnet.solana.com',
          enabled: true,
          rateLimits: {
            maxRequestsPerSecond: 10,
            maxRequestsPerMinute: 500,
            maxRequestsPerHour: 20000
          },
          retryConfig: {
            maxRetries: 3,
            initialDelayMs: 1000,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'devnet-backup',
          type: DataSourceType.RPC,
          priority: 5,
          endpoint: 'https://devnet.solana.com',
          enabled: true,
          rateLimits: {
            maxRequestsPerSecond: 5,
            maxRequestsPerMinute: 300,
            maxRequestsPerHour: 10000
          }
        }
      ],
      fallbackStrategy: 'sequential',
      pollingInterval: 5000, // 5 seconds
      subscriptionTopics: ['transaction']
    };
    
    // Initialize and start ingestion service
    const ingestionService = new IngestionService(healthMonitor);
    await ingestionService.initialize(ingestionConfig, storage);
    
    // Register transaction processor
    const transactionProcessor = new FlowgraphTransactionProcessor(storage);
    ingestionService.registerProcessor(transactionProcessor);
    
    // Start health monitor
    healthMonitor.start();
    
    // Start ingestion
    await ingestionService.start();
    
    console.log('Solana FlowGraph Backend started successfully');
    
    // Set up API routes
    setupApiRoutes(storage);
    
    // Example of handling system shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      
      // Stop services in reverse order
      await ingestionService.stop();
      healthMonitor.stop();
      
      console.log('System shutdown complete');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error starting Solana FlowGraph Backend:', error);
    process.exit(1);
  }
}

/**
 * Set up API routes for Next.js pages to call
 */
function setupApiRoutes(storage: InMemoryHybridStorage) {
  // This function would set up API routes in a production environment
  // For this example, we'll just log that the API is ready
  console.log('API routes ready for frontend to call');
}

// Start the backend
startBackend().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 