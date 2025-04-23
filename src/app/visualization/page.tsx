'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import Link from 'next/link';
import GraphVisualization from '@/components/GraphVisualization';

export default function VisualizationPage() {
  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'transactions' | 'flowgraph' | 'programs' | 'heatmap'>('flowgraph');
  const [visualizationMode, setVisualizationMode] = useState<'mockData' | 'excelData' | 'solanaData'>('mockData');
  const [walletAddress, setWalletAddress] = useState('');
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
  
  const fetchLiveTransactions = useCallback(async () => {
    setIsLoadingLiveData(true);
    try {
      // In a real app, you would fetch from Solscan API
      // This is a mock implementation
      setTimeout(() => {
        setLiveTransactions([
          { signature: '4pzTVEvnRgCmpHC9vKGSoCnA9XtWdJyrgDBMwqbQDaJdPfA6XpLckGGrfYBr3PCPu3HGCCdBsX9nvGpLg1JpfKCw', block: 228499142, timestamp: new Date().getTime() - 120000, fee: 0.000005, status: 'Success' },
          { signature: '2hFXtfxrGXLc9JpGrSrxuF8YdXzJJGCBTi1zYMYrDmQ3FbDmuVtdcm4hEw88MAQofhVnXDi7yDXYhJXhEBJGo8KZ', block: 228499140, timestamp: new Date().getTime() - 140000, fee: 0.000015, status: 'Success' },
          { signature: '4PdEDa6EVo3QjwGSfCSyqjFUYzaeLyNVBsCfvGjswUFK1P8xL8od9H2K2bupoXJYL7R9YXoQJC4mQPvtxUGQwkgV', block: 228499139, timestamp: new Date().getTime() - 180000, fee: 0.000025, status: 'Success' },
          { signature: '5PL97vzNbLvq7wLHryyVS1AEdjrFPwudQzBJ5bnGj1EkQM9twP4kpMuprLG7R6iDLgxmzzkJ21jppGvgngJx6WnD', block: 228499138, timestamp: new Date().getTime() - 220000, fee: 0.000005, status: 'Success' },
          { signature: '27gxDtzGkQ4Cn5DMESHrfynQQuLqjFDc5N2G9lFG6beVVGGkRHs9JXB7m9KBNrE4z4CXEgXDTpXgdpuYmMvr9pYj', block: 228499135, timestamp: new Date().getTime() - 260000, fee: 0.000010, status: 'Success' },
        ]);
        setIsLoadingLiveData(false);
      }, 1500);
    } catch (err) {
      setError('Failed to fetch live transaction data');
      setIsLoadingLiveData(false);
    }
  }, []);

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

  useEffect(() => {
    fetchLiveTransactions();
  }, [fetchLiveTransactions]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const truncateSignature = (signature: string) => {
    return signature.substring(0, 6) + '...' + signature.substring(signature.length - 4);
  };

  // Mock rendering of different visualization views
  const renderVisualization = () => {
    switch (activeView) {
      case 'flowgraph':
        return (
          <div className="h-[400px] border rounded-lg relative">
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
        );
      case 'programs':
        return (
          <div className="h-[400px] border rounded-lg p-4 bg-gray-50">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-4">Program Interaction Flow</h3>
              <div className="flex-1 grid grid-cols-3 gap-4">
                {['Token Program', 'System Program', 'Stake Program', 'SPL Program', 'Metaplex', 'Serum DEX'].map((program, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
                      <span className="font-medium">{program}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div className="flex justify-between mb-1">
                        <span>Invocations:</span>
                        <span>{Math.floor(Math.random() * 1000) + 200}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Success Rate:</span>
                        <span>{(Math.random() * 2 + 98).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg. Time:</span>
                        <span>{(Math.random() * 500 + 100).toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'heatmap':
        return (
          <div className="h-[400px] border rounded-lg p-4 bg-gray-50">
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-medium mb-4">Transaction Activity Heatmap</h3>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {Array(7 * 24).fill(0).map((_, idx) => {
                  const intensity = Math.random();
                  const bgColor = intensity < 0.2 ? 'bg-green-100' : 
                                  intensity < 0.4 ? 'bg-green-200' :
                                  intensity < 0.6 ? 'bg-green-300' :
                                  intensity < 0.8 ? 'bg-green-400' : 'bg-green-500';
                  return (
                    <div key={idx} className={`${bgColor} rounded-sm w-full h-4`} title={`${Math.floor(intensity * 1000)} transactions`}></div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Monday</span>
                <span>Tuesday</span>
                <span>Wednesday</span>
                <span>Thursday</span>
                <span>Friday</span>
                <span>Saturday</span>
                <span>Sunday</span>
              </div>
              <div className="mt-3 flex items-center">
                <span className="text-xs text-gray-500 mr-2">Less</span>
                <div className="flex">
                  <div className="w-5 h-3 bg-green-100"></div>
                  <div className="w-5 h-3 bg-green-200"></div>
                  <div className="w-5 h-3 bg-green-300"></div>
                  <div className="w-5 h-3 bg-green-400"></div>
                  <div className="w-5 h-3 bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">More</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="h-[400px] border rounded-lg p-4 bg-gray-50 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signature
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Block
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee (SOL)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveTransactions.map((tx, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer">
                        {truncateSignature(tx.signature)}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.block}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.fee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Solana Transaction Visualization</h1>
        
        {visualizationMode === 'solanaData' && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Solana Tracker API Key Required</h2>
            <p className="text-blue-700 mb-3">
              To visualize real Solana transactions, you'll need a valid Solana Tracker API key. 
              If you're seeing authentication errors (401), please check that:
            </p>
            <ul className="list-disc pl-5 mb-3 text-blue-700">
              <li>You've entered the complete API key without any spaces</li>
              <li>Your API key is active and has not expired</li>
              <li>You have sufficient credits on your Solana Tracker account</li>
            </ul>
            <p className="text-blue-700">
              <a 
                href="https://docs.solanatracker.io/getting-started/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Learn how to obtain a Solana Tracker API key
              </a>
            </p>
          </div>
        )}
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h2 className="text-xl font-semibold">Solana Blockchain Visualization</h2>
              <div className="mt-2 md:mt-0 flex gap-2">
                <button
                  onClick={fetchLiveTransactions}
                  className="btn-primary py-1.5 px-3 rounded-lg text-sm"
                  disabled={isLoadingLiveData}
                >
                  {isLoadingLiveData ? 'Refreshing...' : 'Refresh Data'}
                </button>
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
                </div>
                <a
                  href="https://solscan.io/txs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary py-1.5 px-3 rounded-lg text-sm flex items-center"
                >
                  <span>View on Solscan</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Visualization type selector */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  activeView === 'transactions' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveView('transactions')}
              >
                Transactions
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  activeView === 'flowgraph' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveView('flowgraph')}
              >
                Flow Graph
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  activeView === 'programs' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveView('programs')}
              >
                Programs
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 ${
                  activeView === 'heatmap' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveView('heatmap')}
              >
                Activity Heatmap
              </button>
            </div>
            
            {isLoadingLiveData ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              renderVisualization()
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
          
          {activeView === 'flowgraph' && (
            <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4">Visualization Controls</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
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
                
                <div>
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
                  
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-700 mb-2">Search Address</h3>
                    <div className="flex">
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter wallet address..."
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-l"
                      />
                      <button
                        onClick={() => setVisualizationMode('solanaData')}
                        className="bg-primary text-white px-3 py-1.5 rounded-r hover:bg-primary/90"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-primary mb-2">Node Colors</h3>
                  <div className="space-y-2">
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
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-primary mb-2">Node Size</h3>
                  <p className="text-sm text-gray-600">
                    The size of each node represents its transaction volume or importance in the network.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-primary mb-2">Edge Thickness</h3>
                  <p className="text-sm text-gray-600">
                    Thicker edges indicate larger transaction values or more frequent interactions between nodes.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Live Block Data</h2>
              <a
                href="https://solscan.io/blocks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <span>View on Solscan</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="border rounded-lg p-4 h-64 overflow-y-auto">
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Block #{228499142 - idx}</span>
                      <span className="text-xs text-gray-500">{formatTime(Date.now() - idx * 40000)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Transactions:</span>
                        <span>{Math.floor(Math.random() * 1000) + 500}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Validator:</span>
                        <span className="truncate ml-1">Validator{idx + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Live Validator Data</h2>
              <a
                href="https://solscan.io/validators"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <span>View on Solscan</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="border rounded-lg p-4 h-64 overflow-y-auto">
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${idx % 5 === 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm font-medium truncate">Validator{idx + 1}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 grid grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span>Stake:</span>
                        <span>{(Math.random() * 1000000).toFixed(0)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uptime:</span>
                        <span>{(Math.random() * 10 + 90).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span>{Math.floor(Math.random() * 10)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skip Rate:</span>
                        <span>{(Math.random() * 2).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Solana Flowgraph Components</h2>
            </div>
            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-primary">Transaction Architecture</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Solana transactions include instructions that target programs, with each instruction specifying accounts it will read from or write to.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-primary">Account Structure</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Accounts in Solana store state and are owned by programs. Programs can only modify accounts they own.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-primary">Program Execution</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Programs are stateless and can call other programs, creating a tree of nested instructions in a transaction.
                </p>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-primary">Token Flow</h3>
                <p className="text-sm text-gray-600 mt-1">
                  SPL tokens are transferred between token accounts, which are owned by the Token Program but associated with user wallets.
                </p>
              </div>
            </div>
          </div>
          
          {/* Add API key info in the visualization section */}
          {visualizationMode === 'solanaData' && (
            <div className="mb-4 mt-2 text-sm text-gray-500">
              <p>
                <strong>Note:</strong> If you encounter authentication errors, you can switch to mock data 
                visualization by clicking the "Mock Data" button above.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 