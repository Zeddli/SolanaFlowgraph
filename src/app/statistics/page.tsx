'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import LineChart from './components/LineChart';
import Link from 'next/link';

// Mock data for charts
const generateMockTransactionVolume = () => {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.floor(Math.random() * 40000) + 20000
  }));
};

const generateMockProgramUsage = () => {
  const programs = [
    { name: 'Token Program', color: '#14F195' },
    { name: 'System Program', color: '#9945FF' },
    { name: 'Serum DEX', color: '#FF9900' },
    { name: 'Metaplex', color: '#FF5733' },
    { name: 'Jupiter', color: '#4267B2' },
    { name: 'Marinade', color: '#00B3E6' },
  ];
  
  return programs.map(program => ({
    name: program.name,
    value: Math.floor(Math.random() * 30) + 5
  }));
};

const generateMockTimeSeriesData = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => ({
    time: `${hour}:00`,
    value: Math.floor(Math.random() * 500) + 200
  }));
};

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [transactionVolumeData, setTransactionVolumeData] = useState(generateMockTransactionVolume());
  const [programUsageData, setProgramUsageData] = useState(generateMockProgramUsage());
  const [timeSeriesData, setTimeSeriesData] = useState(generateMockTimeSeriesData());
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalTransactions: Math.floor(Math.random() * 1000000) + 5000000,
    avgBlockTime: (Math.random() * 0.4 + 0.4).toFixed(2),
    activeAccounts: Math.floor(Math.random() * 1000000) + 2000000,
    tps: Math.floor(Math.random() * 2000) + 1000,
    successRate: (Math.random() * 2 + 98).toFixed(2)
  });

  // Effect to update data when time range changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real app, API calls would go here
        // For now, just use random data
        setTimeout(() => {
          setTransactionVolumeData(generateMockTransactionVolume());
          setProgramUsageData(generateMockProgramUsage());
          setTimeSeriesData(generateMockTimeSeriesData());
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const transactionTypesData = [
    { name: 'Transfers', value: 42 },
    { name: 'Swaps', value: 28 },
    { name: 'NFTs', value: 15 },
    { name: 'Staking', value: 10 },
    { name: 'Other', value: 5 },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Solana Blockchain Statistics</h1>
        <p className="text-gray-600 mb-6">Comprehensive analytics and metrics about the Solana network</p>
        
        {/* Controls and Time Range Selector */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setTimeRange('day')}
              className={`px-4 py-2 rounded-lg text-sm ${
                timeRange === 'day' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              24H
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-lg text-sm ${
                timeRange === 'week' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-lg text-sm ${
                timeRange === 'month' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              30D
            </button>
          </div>
          <div className="flex gap-2">
            <Link
              href="/transactions"
              className="px-4 py-2 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              View Transactions
            </Link>
            <Link
              href="/visualization"
              className="px-4 py-2 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Live Data
            </Link>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-500 font-medium">Total Transactions</h3>
            <p className="text-2xl font-bold mt-1">{formatNumber(statsData.totalTransactions)}</p>
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span>+2.5% from last {timeRange}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-500 font-medium">Avg. Block Time</h3>
            <p className="text-2xl font-bold mt-1">{statsData.avgBlockTime}s</p>
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span>-0.05s improvement</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-500 font-medium">Active Accounts</h3>
            <p className="text-2xl font-bold mt-1">{formatNumber(statsData.activeAccounts)}</p>
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span>+3.2% growth</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-500 font-medium">Current TPS</h3>
            <p className="text-2xl font-bold mt-1">{statsData.tps}</p>
            <div className="mt-2 text-xs text-yellow-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Stable</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-500 font-medium">Success Rate</h3>
            <p className="text-2xl font-bold mt-1">{statsData.successRate}%</p>
            <div className="mt-2 text-xs text-green-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span>+0.1% improvement</span>
            </div>
          </div>
        </div>
        
        {/* Main Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Transaction Volume Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Transaction Volume</h2>
              <div className="text-xs text-gray-500">
                {timeRange === 'day' ? 'Last 24 hours' : timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
              </div>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-64">
                <BarChart data={transactionVolumeData} />
              </div>
            )}
            
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-xs">Peak Volume</p>
                <p className="font-medium">{formatNumber(Math.max(...transactionVolumeData.map(d => d.value)))}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-xs">Average Volume</p>
                <p className="font-medium">
                  {formatNumber(Math.floor(transactionVolumeData.reduce((sum, d) => sum + d.value, 0) / transactionVolumeData.length))}
                </p>
              </div>
            </div>
          </div>
          
          {/* Program Usage Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Program Usage Distribution</h2>
              <div className="text-xs text-gray-500">By percentage</div>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-64">
                <PieChart data={programUsageData} />
              </div>
            )}
            
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {programUsageData.slice(0, 3).map((program, idx) => (
                <div key={idx} className="text-xs flex items-center">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ['#14F195', '#9945FF', '#FF9900'][idx] }}></div>
                  <span>{program.name}: {program.value}%</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Transaction Times Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Hourly Transaction Count</h2>
              <div className="text-xs text-gray-500">Last 24 hours</div>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-64">
                <LineChart data={timeSeriesData} timeRange="day" />
              </div>
            )}
            
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-xs">Peak Hour</p>
                <p className="font-medium">
                  {timeSeriesData.reduce((max, item, i, arr) => item.value > arr[max].value ? i : max, 0)}:00 - 
                  {(timeSeriesData.reduce((max, item, i, arr) => item.value > arr[max].value ? i : max, 0) + 1) % 24}:00
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-xs">Lowest Activity</p>
                <p className="font-medium">
                  {timeSeriesData.reduce((min, item, i, arr) => item.value < arr[min].value ? i : min, 0)}:00 - 
                  {(timeSeriesData.reduce((min, item, i, arr) => item.value < arr[min].value ? i : min, 0) + 1) % 24}:00
                </p>
              </div>
            </div>
          </div>
          
          {/* Transaction Types Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Transaction Types</h2>
              <div className="text-xs text-gray-500">By volume</div>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-64">
                <BarChart data={transactionTypesData} />
              </div>
            )}
            
            <div className="mt-3 text-xs text-center text-gray-600">
              <p>Token transfers account for the majority of transactions on Solana</p>
            </div>
          </div>
        </div>
        
        {/* Additional Stats and Analytics */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Advanced Blockchain Metrics</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-1">Network Stake</h3>
              <p className="text-2xl font-bold">{formatNumber(Math.floor(Math.random() * 500000000) + 500000000)} SOL</p>
              <p className="text-xs text-gray-500 mt-1">Total SOL staked in the network</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-1">Validators</h3>
              <p className="text-2xl font-bold">{Math.floor(Math.random() * 100) + 1600}</p>
              <p className="text-xs text-gray-500 mt-1">Active validators on the network</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-1">Market Cap</h3>
              <p className="text-2xl font-bold">${formatNumber(Math.floor(Math.random() * 10000000000) + 10000000000)}</p>
              <p className="text-xs text-gray-500 mt-1">Total market capitalization</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-1">Fee Revenue</h3>
              <p className="text-2xl font-bold">{formatNumber(Math.floor(Math.random() * 10000) + 5000)} SOL</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days network fees</p>
            </div>
          </div>
        </div>
        
        {/* Performance Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Blockchain Performance Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blockchain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TPS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Block Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finality</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">Solana</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~2,000</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">400ms</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~$0.00025</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~2s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Ethereum</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~15</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">12s</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Variable ($1-$30)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~6 min</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Avalanche</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~4,500</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2s</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~$0.10</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~2s</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">BNB Chain</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~100</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3s</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~$0.03</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~30s</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            Data represents average performance metrics. Actual performance may vary based on network conditions.
          </p>
        </div>
      </div>
    </main>
  );
} 