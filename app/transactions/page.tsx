'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import GraphVisualization from '@/components/GraphVisualization';
import Link from 'next/link';

export default function TransactionsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [visualizationMode, setVisualizationMode] = useState<'mockData' | 'excelData' | 'solanaData'>('mockData');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    minValue: 0,
    maxValue: 1000,
    nodeTypes: {
      wallet: true,
      program: true,
      protocol: true,
      swap: true
    }
  });

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setVisualizationMode('solanaData');
    }
  };

  // Toggle filter settings
  const toggleNodeType = (type: 'wallet' | 'program' | 'protocol' | 'swap') => {
    setFilters(prev => ({
      ...prev,
      nodeTypes: {
        ...prev.nodeTypes,
        [type]: !prev.nodeTypes[type]
      }
    }));
  };

  // Update value range filter
  const updateValueRange = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      minValue: min,
      maxValue: max
    }));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Transaction Analysis</h1>
        <p className="text-gray-600 mb-6">Visualize and analyze Solana blockchain transactions and their relationships</p>
        
        {/* Search and Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter wallet address, transaction signature, or block..."
                  className="w-full px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-r-lg hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setVisualizationMode('mockData')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  visualizationMode === 'mockData' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Demo Data
              </button>
              <button
                onClick={() => setVisualizationMode('excelData')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  visualizationMode === 'excelData' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sample Data
              </button>
              <Link 
                href="/visualization" 
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Live View
              </Link>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Panel */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Node Types</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="wallet"
                    checked={filters.nodeTypes.wallet}
                    onChange={() => toggleNodeType('wallet')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="wallet" className="ml-2 text-sm text-gray-700">Wallets</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="program"
                    checked={filters.nodeTypes.program}
                    onChange={() => toggleNodeType('program')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="program" className="ml-2 text-sm text-gray-700">Programs</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="protocol"
                    checked={filters.nodeTypes.protocol}
                    onChange={() => toggleNodeType('protocol')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="protocol" className="ml-2 text-sm text-gray-700">Protocols</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="swap"
                    checked={filters.nodeTypes.swap}
                    onChange={() => toggleNodeType('swap')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="swap" className="ml-2 text-sm text-gray-700">Swap Platforms</label>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Value Range</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="minValue" className="block text-xs text-gray-500">Min Value</label>
                    <input
                      type="number"
                      id="minValue"
                      value={filters.minValue}
                      onChange={(e) => updateValueRange(Number(e.target.value), filters.maxValue)}
                      className="w-full p-1.5 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxValue" className="block text-xs text-gray-500">Max Value</label>
                    <input
                      type="number"
                      id="maxValue"
                      value={filters.maxValue}
                      onChange={(e) => updateValueRange(filters.minValue, Number(e.target.value))}
                      className="w-full p-1.5 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 mb-2">Legend</h3>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#9945FF] mr-2"></div>
                <span className="text-sm">Wallets</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#14F195] mr-2"></div>
                <span className="text-sm">Programs</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#FF9900] mr-2"></div>
                <span className="text-sm">Protocols</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-[#FF5733] mr-2"></div>
                <span className="text-sm">Swap Platforms</span>
              </div>
              <div className="pt-2 text-xs text-gray-500">
                <p>• Node size indicates transaction volume</p>
                <p>• Edge thickness shows value transferred</p>
              </div>
            </div>
          </div>
          
          {/* Visualization Panel */}
          <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Transaction Flow Graph</h2>
            
            {loading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-[600px] border rounded-lg relative">
                <GraphVisualization dataSource={visualizationMode} filters={filters} />
                
                <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md text-sm">
                  <p><strong>Tips:</strong></p>
                  <ul className="text-xs text-gray-600 list-disc pl-4">
                    <li>Scroll to zoom in/out</li>
                    <li>Drag to move the graph</li>
                    <li>Click on nodes to see details</li>
                    <li>Drag nodes to reposition</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Transaction Patterns</h3>
                <p className="text-sm text-gray-600">
                  This visualization shows how funds flow between accounts, programs, and protocols on the Solana blockchain.
                  Identify patterns in transaction flow and discover common pathways for certain transaction types.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Insight Analysis</h3>
                <p className="text-sm text-gray-600">
                  More connected nodes indicate higher activity levels. Program nodes with many connections are often 
                  essential protocols like Token Program or Serum DEX that facilitate a large volume of transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Transaction Analysis Section */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Common Transaction Pathways</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary mb-2">Token Transfers</h3>
              <p className="text-sm text-gray-600">
                Wallet → Token Program → Destination Wallet
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Simple tokens transfers follow this pattern, with the Token Program facilitating the movement of SPL tokens between accounts.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary mb-2">Swap Operations</h3>
              <p className="text-sm text-gray-600">
                Wallet → DEX Program → Pool Accounts → Wallet
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Token swaps involve DEX programs that interact with liquidity pools to exchange one token for another.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary mb-2">NFT Minting</h3>
              <p className="text-sm text-gray-600">
                Wallet → Metaplex → Token Program → Wallet
              </p>
              <p className="mt-2 text-xs text-gray-500">
                NFT creation involves Metaplex programs that work with the Token Program to create and distribute non-fungible tokens.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Educational Section */}
      <div className="bg-gray-100 py-12 mt-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Understanding Solana Transaction Flow</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3">Key Components</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-primary font-bold mr-2">•</span>
                  <span><strong>Wallets:</strong> Accounts that can initiate transactions and hold tokens.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary font-bold mr-2">•</span>
                  <span><strong>Programs:</strong> Smart contracts that execute transaction logic (like Token Program, System Program).</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary font-bold mr-2">•</span>
                  <span><strong>Accounts:</strong> Data stores that can be owned by programs and modified by them.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary font-bold mr-2">•</span>
                  <span><strong>Instructions:</strong> Commands sent to programs within transactions.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary font-bold mr-2">•</span>
                  <span><strong>Protocols:</strong> Sets of programs that work together to provide a service (like Serum, Jupiter).</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3">Common Transaction Patterns</h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Simple Token Transfer:</p>
                  <div className="flex items-center justify-center my-2">
                    <span>Wallet</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>Token Program</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>Recipient</span>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium">Swap Transaction:</p>
                  <div className="flex items-center justify-center flex-wrap my-2">
                    <span>Wallet</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>DEX</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>Pool</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>Token Program</span>
                    <svg width="40" height="20">
                      <line x1="0" y1="10" x2="40" y2="10" stroke="#9945FF" strokeWidth="2" strokeDasharray="5,2" />
                      <polygon points="35,5 40,10 35,15" fill="#9945FF" />
                    </svg>
                    <span>Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 