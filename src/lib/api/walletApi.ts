import { Transaction } from '@/types/transactions';
import { PublicKey } from '@solana/web3.js';

// Mock data for development
const mockTransactions: Transaction[] = [
  {
    signature: '5UfVTYr5WwXKGFQHNPZG5RzPybGvduXTmf7gSHXGjmNKgvUrUbbC9fBsLrDvTgMygTUfhU3C1JgQezrrCUE1XzdQ',
    timestamp: Date.now() - 3600000,
    slot: 196809304,
    success: true,
    fee: 0.000005,
    blockTime: Date.now() - 3600000,
    type: 'SOL Transfer',
    amount: 0.1,
    tokenAmount: null,
    tokenSymbol: null,
    fromAddress: 'DRpbCBMxVnDK7maPM5tGv6MvBBoVUGRBUBJR1Mq5hpWV',
    toAddress: '8JUgvLGZ2F7Z4bRu5qkm6CfaJ3M8MEvTQRFXzLq5vMxW'
  },
  {
    signature: '3UfVTYr5WwXKGFQHNPZG5RzPybGvduXTmf7gSHXGjmNKgvUrUbbC9fBsLrDvTgMygTUfhU3C1JgQezrrCUE1XzdQ',
    timestamp: Date.now() - 7200000,
    slot: 196799304,
    success: true,
    fee: 0.000005,
    blockTime: Date.now() - 7200000,
    type: 'Token Transfer',
    amount: null,
    tokenAmount: 15,
    tokenSymbol: 'USDC',
    fromAddress: 'DRpbCBMxVnDK7maPM5tGv6MvBBoVUGRBUBJR1Mq5hpWV',
    toAddress: 'FQeZSZSGMmMKrq3SxN1CnEYf2uPjvEnQrDf4K6WAjWJZ'
  },
  {
    signature: '2UfVTYr5WwXKGFQHNPZG5RzPybGvduXTmf7gSHXGjmNKgvUrUbbC9fBsLrDvTgMygTUfhU3C1JgQezrrCUE1XzdQ',
    timestamp: Date.now() - 10800000,
    slot: 196789304,
    success: false,
    fee: 0.000005,
    blockTime: Date.now() - 10800000,
    type: 'Swap',
    amount: 0.05,
    tokenAmount: 2.5,
    tokenSymbol: 'BONK',
    fromAddress: 'DRpbCBMxVnDK7maPM5tGv6MvBBoVUGRBUBJR1Mq5hpWV',
    toAddress: 'DRpbCBMxVnDK7maPM5tGv6MvBBoVUGRBUBJR1Mq5hpWV'
  }
];

/**
 * Fetch transactions for a specific wallet address with fallback options
 * 
 * @param walletAddress The Solana wallet address to fetch transactions for
 * @returns Promise resolving to an array of Transaction objects
 */
export async function fetchWalletTransactions(walletAddress: string): Promise<Transaction[]> {
  // Validate wallet address format
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid Solana wallet address format');
  }

  // For development environment, return mock data
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockTransactions;
  }
  
  // Try multiple API endpoints with fallback
  // Store errors to provide more detailed feedback if all attempts fail
  const errors: Record<string, Error> = {};
  
  try {
    return await fetchFromSolanaTracker(walletAddress);
  } catch (error) {
    errors.solanaTracker = error instanceof Error ? error : new Error(String(error));
    console.log('Solana Tracker API failed, trying Solscan...', errors.solanaTracker.message);
  }
  
  try {
    return await fetchFromSolscan(walletAddress);
  } catch (error) {
    errors.solscan = error instanceof Error ? error : new Error(String(error));
    console.log('Solscan API failed, trying Helius RPC...', errors.solscan.message);
  }
  
  try {
    return await fetchFromHeliusRPC(walletAddress);
  } catch (error) {
    errors.helius = error instanceof Error ? error : new Error(String(error));
    console.log('Helius RPC failed', errors.helius.message);
    
    // Provide detailed error with information about why each API failed
    const errorMessage = [
      'Failed to fetch wallet transactions from any source:',
      `- Solana Tracker: ${errors.solanaTracker?.message}`,
      `- Solscan: ${errors.solscan?.message}`,
      `- Helius: ${errors.helius?.message}`
    ].join('\n');
    
    throw new Error(errorMessage);
  }
}

/**
 * Fetch transactions using Solana Tracker API
 */
async function fetchFromSolanaTracker(walletAddress: string): Promise<Transaction[]> {
  const apiKey = process.env.NEXT_PUBLIC_SOLANA_TRACKER_API_KEY;
  
  // Check if API key is configured
  if (!apiKey) {
    throw new Error('Solana Tracker API key not configured in environment variables');
  }
  
  const headers: HeadersInit = { 
    'Accept': 'application/json',
    'X-API-Key': apiKey
  };
  
  try {
    const response = await fetch(
      `https://api.solanatracker.io/v1/wallet/${walletAddress}/transactions`,
      { headers }
    );
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      const statusText = response.statusText || 'Unknown error';
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error(`Authentication failed (401): Invalid Solana Tracker API key or unauthorized access. API response: ${statusText}`);
      } else if (response.status === 403) {
        throw new Error(`Access forbidden (403): Your Solana Tracker API key doesn't have sufficient permissions. API response: ${statusText}`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429): Too many requests to Solana Tracker API. Please try again later. API response: ${statusText}`);
      } else {
        throw new Error(`Solana Tracker API error (${response.status}): ${statusText}${errorBody ? ` - ${errorBody}` : ''}`);
      }
    }
    
    const data = await response.json();
    if (!data.transactions || !Array.isArray(data.transactions)) {
      throw new Error('Invalid response format from Solana Tracker API: missing transactions array');
    }
    
    return data.transactions.map(mapSolanaTrackerTransaction);
  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error but add some context
      error.message = `Error with Solana Tracker API: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Fetch transactions using Solscan API
 */
async function fetchFromSolscan(walletAddress: string): Promise<Transaction[]> {
  const apiKey = process.env.NEXT_PUBLIC_SOLSCAN_API_KEY;
  const headers: HeadersInit = { 'Accept': 'application/json' };
  
  if (!apiKey) {
    console.warn('Solscan API key not configured, proceeding with limited functionality');
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  try {
    const response = await fetch(
      `https://public-api.solscan.io/account/transactions?account=${walletAddress}&limit=20`,
      { headers }
    );
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      const statusText = response.statusText || 'Unknown error';
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error(`Authentication failed (401): Invalid Solscan API key or unauthorized access. API response: ${statusText}`);
      } else if (response.status === 403) {
        throw new Error(`Access forbidden (403): Your Solscan API key doesn't have sufficient permissions. API response: ${statusText}`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429): Too many requests to Solscan API. Please try again later. API response: ${statusText}`);
      } else {
        throw new Error(`Solscan API error (${response.status}): ${statusText}${errorBody ? ` - ${errorBody}` : ''}`);
      }
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from Solscan API: expected array');
    }
    
    return data.map(mapSolscanTransaction);
  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error but add some context
      error.message = `Error with Solscan API: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Fetch transactions using Helius RPC API
 */
async function fetchFromHeliusRPC(walletAddress: string): Promise<Transaction[]> {
  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('Helius API key not configured in environment variables');
  }
  
  try {
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getSignaturesForAddress',
          params: [walletAddress, { limit: 20 }]
        })
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      const statusText = response.statusText || 'Unknown error';
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error(`Authentication failed (401): Invalid Helius API key or unauthorized access. API response: ${statusText}`);
      } else if (response.status === 403) {
        throw new Error(`Access forbidden (403): Your Helius API key doesn't have sufficient permissions. API response: ${statusText}`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429): Too many requests to Helius API. Please try again later. API response: ${statusText}`);
      } else {
        throw new Error(`Helius RPC error (${response.status}): ${statusText}${errorBody ? ` - ${errorBody}` : ''}`);
      }
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Helius RPC returned error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    if (!data.result || !Array.isArray(data.result)) {
      throw new Error('Invalid response format from Helius RPC: missing or invalid result array');
    }
    
    const signatures = data.result;
    return processHeliusTransactions(signatures, apiKey);
  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error but add some context
      error.message = `Error with Helius RPC API: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Process transaction signatures from Helius to get full transaction details
 */
async function processHeliusTransactions(
  signatures: any[],
  apiKey: string
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  for (const sig of signatures) {
    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'my-id',
            method: 'getTransaction',
            params: [sig.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
          })
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.result) {
        transactions.push(mapHeliusTransaction(data.result, sig));
      }
    } catch (err) {
      console.error(`Error fetching transaction ${sig.signature}:`, err);
    }
  }
  
  return transactions;
}

/**
 * Map Solana Tracker API response to Transaction type
 */
function mapSolanaTrackerTransaction(tx: any): Transaction {
  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    slot: tx.slot,
    success: tx.status === 'success',
    fee: tx.fee / 1000000000, // Convert lamports to SOL
    blockTime: tx.blockTime,
    type: determineTransactionType(tx),
    amount: tx.sol_transfer || null,
    tokenAmount: tx.token_transfer_amount || null,
    tokenSymbol: tx.token_symbol || null,
    fromAddress: tx.sender || tx.from_address,
    toAddress: tx.recipient || tx.to_address
  };
}

/**
 * Map Solscan API response to Transaction type
 */
function mapSolscanTransaction(tx: any): Transaction {
  return {
    signature: tx.txHash,
    timestamp: tx.blockTime * 1000, // Convert seconds to milliseconds
    slot: tx.slot,
    success: tx.status === 'Success',
    fee: tx.fee / 1000000000, // Convert lamports to SOL
    blockTime: tx.blockTime * 1000,
    type: 'Transaction', // Default type, we would need additional parsing for specific types
    amount: null, // Would need parsing transaction data
    tokenAmount: null,
    tokenSymbol: null,
    fromAddress: '', // Would need parsing transaction data
    toAddress: '' // Would need parsing transaction data
  };
}

/**
 * Map Helius RPC response to Transaction type
 */
function mapHeliusTransaction(tx: any, sigInfo: any): Transaction {
  let fromAddress = '';
  let toAddress = '';
  let amount = null;
  let tokenAmount = null;
  let tokenSymbol = null;
  let type = 'Unknown';
  
  // Try to determine transaction type and extract relevant data
  // This would need more sophisticated parsing in a real implementation
  
  return {
    signature: tx.transaction.signatures[0],
    timestamp: tx.blockTime ? tx.blockTime * 1000 : sigInfo.blockTime * 1000,
    slot: tx.slot,
    success: tx.meta?.err === null,
    fee: (tx.meta?.fee || 0) / 1000000000, // Convert lamports to SOL
    blockTime: tx.blockTime ? tx.blockTime * 1000 : sigInfo.blockTime * 1000,
    type,
    amount,
    tokenAmount,
    tokenSymbol,
    fromAddress,
    toAddress
  };
}

/**
 * Determine transaction type based on transaction data
 */
function determineTransactionType(tx: any): string {
  if (tx.sol_transfer && tx.sol_transfer > 0) {
    return 'SOL Transfer';
  } else if (tx.token_transfer_amount && tx.token_transfer_amount > 0) {
    return 'Token Transfer';
  } else if (tx.program_id === '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin') {
    return 'Serum DEX';
  } else if (tx.program_id === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
    return 'Jupiter Swap';
  }
  return 'Other';
}

/**
 * Validates if a string is a valid Solana address format
 * 
 * @param address The address string to validate
 * @returns Boolean indicating if the address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
} 