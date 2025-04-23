'use client';

import { useState } from 'react';
import { Client } from '@solana-tracker/data-api';

// Define proper interfaces matching the Solana Tracker API
interface WalletTrackerProps {
  onDataLoaded?: (data: WalletData) => void;
}

interface WalletData {
  address: string;
  balance: number;
  transactions: Transaction[];
  tokens: Token[];
}

interface Transaction {
  signature: string;
  timestamp: number;
  slot: number;
  success: boolean;
  tokenTransfers: TokenTransfer[];
  fee: number;
}

interface TokenTransfer {
  amount: number;
  decimals: number;
  fromAddress: string;
  fromOwner: string;
  mint: string;
  toAddress: string;
  toOwner: string;
  uiAmount: number;
  tokenName?: string;
  tokenSymbol?: string;
}

interface Token {
  tokenAddress: string;
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  usdValue: number;
  symbol?: string;
  name?: string;
}

export default function WalletTracker({ onDataLoaded }: WalletTrackerProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const fetchWalletData = async () => {
    if (!walletAddress || !apiKey) {
      setError('Wallet address and API key are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize client with API key
      const client = new Client({
        apiKey: apiKey,
      });
      
      // Fetch wallet information
      const wallet = await client.getWallet(walletAddress);
      
      // Fetch recent transactions (last 20)
      const txResponse = await client.getWalletTransactions(walletAddress, { limit: 20 });
      
      // Prepare data in our format
      const data: WalletData = {
        address: walletAddress,
        balance: wallet.lamports ? wallet.lamports / 10**9 : 0, // Convert lamports to SOL
        transactions: txResponse.transactions || [],
        tokens: wallet.tokens || []
      };
      
      // Update state with fetched data
      setWalletData(data);
      
      // Call the callback if provided
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Solana Wallet Tracker</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter Solana wallet address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Solana Tracker API Key"
          />
        </div>
        
        <button
          onClick={fetchWalletData}
          disabled={loading || !walletAddress || !apiKey}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading || !walletAddress || !apiKey
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Loading...' : 'Track Wallet'}
        </button>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {walletData && (
        <div className="mt-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Wallet Summary</h3>
            <p><span className="font-medium">Address:</span> {walletData.address}</p>
            <p><span className="font-medium">Balance:</span> {walletData.balance.toFixed(4)} SOL</p>
            <p><span className="font-medium">Tokens:</span> {walletData.tokens.length}</p>
          </div>
          
          {walletData.tokens.length > 0 && (
            <div>
              <h3 className="font-medium text-lg mb-2">Token Holdings</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {walletData.tokens.map((token, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {token.symbol || token.name || token.mint.slice(0, 8) + '...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {token.uiAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${token.usdValue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {walletData.transactions.length > 0 && (
            <div>
              <h3 className="font-medium text-lg mb-2">Recent Transactions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {walletData.transactions.map((tx, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          <a 
                            href={`https://solscan.io/tx/${tx.signature}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(tx.timestamp * 1000).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {tx.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(tx.fee / 10**9).toFixed(6)} SOL
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 