'use client';

import { useState, useEffect } from 'react';
import { fetchWalletTransactions, isValidSolanaAddress } from '@/lib/api/walletApi';
import { Transaction } from '@/types/transactions';

interface WalletTransactionsProps {
  initialAddress?: string;
}

export default function WalletTransactions({ initialAddress = '' }: WalletTransactionsProps) {
  const [address, setAddress] = useState<string>(initialAddress);
  const [inputAddress, setInputAddress] = useState<string>(initialAddress);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAddress && isValidSolanaAddress(initialAddress)) {
      loadTransactions(initialAddress);
    }
  }, [initialAddress]);

  const loadTransactions = async (walletAddress: string) => {
    if (!isValidSolanaAddress(walletAddress)) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchWalletTransactions(walletAddress);
      setTransactions(data);
      setAddress(walletAddress);
    } catch (err) {
      setError(`Failed to load transactions: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransactions(inputAddress);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAmount = (amount: number | null, symbol: string | null) => {
    if (amount === null) return '-';
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 9 })} ${symbol || 'SOL'}`;
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Solana Wallet Transactions</h1>
      
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter Solana wallet address"
          className="flex-1 p-2 border border-gray-300 rounded"
        />
        <button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {address && !error && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing transactions for: <span className="font-mono">{address}</span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.signature} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">
                      <a 
                        href={`https://solscan.io/tx/${tx.signature}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {tx.signature.substring(0, 8)}...
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(tx.timestamp)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tx.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {tx.tokenAmount !== null 
                        ? formatAmount(tx.tokenAmount, tx.tokenSymbol) 
                        : formatAmount(tx.amount, null)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                      <a 
                        href={`https://solscan.io/account/${tx.fromAddress}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {truncateAddress(tx.fromAddress)}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                      <a 
                        href={`https://solscan.io/account/${tx.toAddress}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {truncateAddress(tx.toAddress)}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${tx.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tx.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading && !error && (
            <div className="text-center p-8 bg-gray-50 rounded">
              {address ? 'No transactions found for this wallet address.' : 'Enter a wallet address to view transactions.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 