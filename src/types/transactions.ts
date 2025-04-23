/**
 * Represents a Solana blockchain transaction
 */
export interface Transaction {
  /** Unique transaction signature (hash) */
  signature: string;
  
  /** Unix timestamp of when the transaction was processed */
  timestamp: number;
  
  /** Solana slot number where the transaction was included */
  slot: number;
  
  /** Whether the transaction was successful or failed */
  success: boolean;
  
  /** Transaction fee in SOL */
  fee: number;
  
  /** Block time in Unix timestamp format */
  blockTime: number;
  
  /** Type of transaction (e.g., "SOL Transfer", "Token Transfer", "Swap", etc.) */
  type: string;
  
  /** Amount of SOL transferred (null for token transfers) */
  amount: number | null;
  
  /** Amount of tokens transferred (null for SOL transfers) */
  tokenAmount: number | null;
  
  /** Symbol of the token transferred (null for SOL transfers) */
  tokenSymbol: string | null;
  
  /** Sender's wallet address */
  fromAddress: string;
  
  /** Recipient's wallet address */
  toAddress: string;
} 