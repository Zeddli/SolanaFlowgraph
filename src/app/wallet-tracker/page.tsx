'use client';

import React from 'react';
import Header from '../components/Header';
import WalletTracker from '../components/WalletTracker';

export default function WalletTrackerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Wallet Transaction Tracker</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Enter any Solana wallet address to view its transaction history, including SOL transfers and token transactions.
            </p>
          </div>
          
          <WalletTracker />
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">About This Tool</h2>
            <p className="text-gray-600">
              The Wallet Transaction Tracker uses the Solana blockchain API to retrieve transaction history. 
              For each transaction, you can see details such as the transaction signature, type, amount, sender/recipient, 
              timestamp, and status. Click on a transaction signature to view more details on Solana Explorer.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 