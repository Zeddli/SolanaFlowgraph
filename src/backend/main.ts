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

/**
 * Example transaction processor that logs transaction data
 */
class ExampleTransactionProcessor implements TransactionProcessor {
  async processTransaction(transaction: RawTransactionData): Promise<void> {
    console.log(`Processing transaction ${transaction.signature} from slot ${transaction.slot}`);
    
    // Here you would implement your custom transaction processing logic
    // For example, extracting specific instructions, updating state, etc.
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    console.log('Starting Solana Flow Graph system...');
    
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
          id: 'mainnet-beta',
          type: DataSourceType.RPC,
          priority: 10,
          endpoint: 'https://api.mainnet-beta.solana.com',
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
          id: 'backup-rpc',
          type: DataSourceType.RPC,
          priority: 5,
          endpoint: 'https://solana-api.projectserum.com',
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
    const transactionProcessor = new ExampleTransactionProcessor();
    ingestionService.registerProcessor(transactionProcessor);
    
    // Start health monitor
    healthMonitor.start();
    
    // Start ingestion
    await ingestionService.start();
    
    console.log('Solana Flow Graph system started successfully');
    
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
    console.error('Error starting system:', error);
    process.exit(1);
  }
}

// Run the application
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 