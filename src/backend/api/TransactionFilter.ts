import { HybridStorage } from '../storage/types';

/**
 * Advanced filtering options for transaction queries
 */
export interface TransactionFilter {
  timeRange?: {
    start: Date;
    end: Date;
  };
  amounts?: {
    min?: number;
    max?: number;
  };
  transactionTypes?: string[];
  programs?: string[];
  wallets?: string[];
  tags?: string[];
  status?: 'success' | 'failed' | 'all';
  sortBy?: 'time' | 'amount' | 'program';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Type for transaction data returned from filtering
 */
export interface FilteredTransaction {
  signature: string;
  slot: number;
  timestamp: Date;
  blockTime?: number;
  sourceWallet?: string;
  targetWallet?: string;
  programIds: string[];
  amount?: number;
  tokenAddress?: string;
  status: string;
  instructions: any[];
  tags: string[];
}

/**
 * Apply transaction filters to both time-series and graph data sources
 */
export async function applyTransactionFilters(
  storage: HybridStorage,
  filters: TransactionFilter
): Promise<FilteredTransaction[]> {
  // Initialize queries for both storages
  const timeSeriesQuery = buildTimeSeriesQuery(filters);
  const graphQuery = buildGraphQuery(filters);
  
  // Get data from time-series storage
  const timeSeriesResults = await storage.timeSeries.query('transactions', timeSeriesQuery);
  
  // If we have wallet or tag filters, need to query graph db as well
  let transactions: FilteredTransaction[] = [];
  
  if (filters.wallets?.length || filters.tags?.length) {
    // Get data from graph storage and merge with time-series data
    const graphResults = await storage.graph.query(graphQuery);
    
    // Get all matching transaction signatures from graph DB
    const graphSignatures = new Set<string>();
    
    graphResults.edges.forEach(edge => {
      if (edge.properties.signature) {
        graphSignatures.add(edge.properties.signature);
      }
    });
    
    // Only include transactions that match both queries if needed
    transactions = timeSeriesResults
      .filter(entry => {
        const signature = entry.data.signature;
        return !graphSignatures.size || graphSignatures.has(signature);
      })
      .map(mapTimeSeriesEntryToTransaction);
  } else {
    // Just use time-series data
    transactions = timeSeriesResults.map(mapTimeSeriesEntryToTransaction);
  }
  
  // Apply additional filtering that might not be handled by the database queries
  return postFilterTransactions(transactions, filters);
}

/**
 * Build a query for the time-series database based on filters
 */
function buildTimeSeriesQuery(filters: TransactionFilter): any {
  const query: any = {
    startTime: filters.timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: filters.timeRange?.end || new Date(),
    limit: filters.limit || 100,
    tags: {}
  };
  
  // Add status filter
  if (filters.status && filters.status !== 'all') {
    query.tags.status = filters.status;
  }
  
  // Add program filter
  if (filters.programs?.length === 1) {
    query.tags.program_id = filters.programs[0];
  }
  
  // Address (wallet) filter gets handled in post-processing
  // since it could be source or target
  
  return query;
}

/**
 * Build a query for the graph database based on filters
 */
function buildGraphQuery(filters: TransactionFilter): any {
  const query: any = {
    limit: filters.limit || 100
  };
  
  // If specific wallets are provided, we query for them
  if (filters.wallets?.length) {
    query.nodeIds = filters.wallets;
  }
  
  // If tags are provided, we need to use them
  if (filters.tags?.length) {
    query.tags = filters.tags;
  }
  
  return query;
}

/**
 * Convert a time-series entry to a filtered transaction
 */
function mapTimeSeriesEntryToTransaction(entry: any): FilteredTransaction {
  const txData = entry.data;
  
  return {
    signature: txData.signature,
    slot: txData.slot,
    timestamp: entry.timestamp,
    blockTime: txData.blockTime,
    sourceWallet: txData.source_wallet,
    targetWallet: txData.target_wallet,
    programIds: Array.isArray(txData.program_ids) ? txData.program_ids : 
                (txData.program_id ? [txData.program_id] : []),
    amount: txData.amount,
    tokenAddress: txData.token_id,
    status: txData.status || 'unknown',
    instructions: txData.instructions || [],
    tags: Object.keys(entry.tags || {})
      .filter(key => entry.tags[key] === true)
      .map(key => key)
  };
}

/**
 * Apply additional filters that might not be covered by database queries
 */
function postFilterTransactions(
  transactions: FilteredTransaction[], 
  filters: TransactionFilter
): FilteredTransaction[] {
  // Filter by amount
  if (filters.amounts?.min !== undefined || filters.amounts?.max !== undefined) {
    transactions = transactions.filter(tx => {
      const amount = tx.amount || 0;
      const passesMin = filters.amounts?.min === undefined || amount >= filters.amounts.min;
      const passesMax = filters.amounts?.max === undefined || amount <= filters.amounts.max;
      return passesMin && passesMax;
    });
  }
  
  // Filter by wallet (could be source or target)
  if (filters.wallets?.length) {
    const walletSet = new Set(filters.wallets);
    transactions = transactions.filter(tx => 
      (tx.sourceWallet && walletSet.has(tx.sourceWallet)) || 
      (tx.targetWallet && walletSet.has(tx.targetWallet))
    );
  }
  
  // Filter by multiple programs
  if (filters.programs?.length && filters.programs.length > 1) {
    const programSet = new Set(filters.programs);
    transactions = transactions.filter(tx => 
      tx.programIds.some(id => programSet.has(id))
    );
  }
  
  // Sort results
  if (filters.sortBy) {
    const direction = filters.sortDirection === 'asc' ? 1 : -1;
    
    transactions.sort((a, b) => {
      switch (filters.sortBy) {
        case 'time':
          return direction * (a.timestamp.getTime() - b.timestamp.getTime());
        case 'amount':
          return direction * ((a.amount || 0) - (b.amount || 0));
        case 'program':
          const aProgram = a.programIds[0] || '';
          const bProgram = b.programIds[0] || '';
          return direction * aProgram.localeCompare(bProgram);
        default:
          return 0;
      }
    });
  }
  
  // Apply pagination if needed and not already handled in database
  if (filters.offset && filters.offset > 0) {
    transactions = transactions.slice(filters.offset);
  }
  
  if (filters.limit && !filters.wallets?.length && !filters.tags?.length) {
    // Only apply limit here if we didn't already limit in the database query
    // (which happens when we needed to get results from both storage systems)
    transactions = transactions.slice(0, filters.limit);
  }
  
  return transactions;
}

/**
 * Advanced API for transaction filtering
 */
export class TransactionFilterService {
  private storage: HybridStorage;
  
  constructor(storage: HybridStorage) {
    this.storage = storage;
  }
  
  /**
   * Filter transactions by various criteria
   */
  async filterTransactions(filters: TransactionFilter): Promise<FilteredTransaction[]> {
    return applyTransactionFilters(this.storage, filters);
  }
  
  /**
   * Find related transactions
   */
  async findRelatedTransactions(signature: string): Promise<FilteredTransaction[]> {
    // First get the transaction by signature
    const txEntries = await this.storage.timeSeries.query('transactions', {
      tags: { signature }
    });
    
    if (!txEntries.length) {
      return [];
    }
    
    const tx = mapTimeSeriesEntryToTransaction(txEntries[0]);
    
    // Find transactions involving the same wallets
    const walletFilters: TransactionFilter = {
      wallets: [tx.sourceWallet, tx.targetWallet].filter(Boolean) as string[],
      timeRange: {
        start: new Date(tx.timestamp.getTime() - 24 * 60 * 60 * 1000),
        end: new Date(tx.timestamp.getTime() + 24 * 60 * 60 * 1000)
      },
      limit: 50
    };
    
    return this.filterTransactions(walletFilters);
  }
  
  /**
   * Find similar transactions based on amount and programs
   */
  async findSimilarTransactions(signature: string): Promise<FilteredTransaction[]> {
    // First get the transaction by signature
    const txEntries = await this.storage.timeSeries.query('transactions', {
      tags: { signature }
    });
    
    if (!txEntries.length) {
      return [];
    }
    
    const tx = mapTimeSeriesEntryToTransaction(txEntries[0]);
    
    // Find transactions with similar characteristics
    const similarFilters: TransactionFilter = {
      programs: tx.programIds,
      amounts: {
        min: tx.amount ? tx.amount * 0.8 : undefined,
        max: tx.amount ? tx.amount * 1.2 : undefined
      },
      timeRange: {
        start: new Date(tx.timestamp.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      limit: 50
    };
    
    return this.filterTransactions(similarFilters);
  }
} 