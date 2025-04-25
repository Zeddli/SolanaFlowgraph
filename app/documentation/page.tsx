import React from 'react';
import Header from '../components/Header';
import Link from 'next/link';

export const metadata = {
  title: 'Documentation | Solana FlowGraph',
  description: 'Technical documentation, architecture details, and data sourcing methodology',
};

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Documentation</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Project Overview</h2>
            <p className="text-gray-600 mb-4">
              Introduction to Solana FlowGraph, including design rationale, key features, and potential impact.
            </p>
            <Link href="/documentation/overview" className="text-primary hover:text-primary-dark font-medium">
              Read more →
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Data Sources & Methodology</h2>
            <p className="text-gray-600 mb-4">
              Detailed information about data collection, processing, and visualization techniques.
            </p>
            <Link href="https://github.com/Zeddli/SolanaFlowgraph/blob/main/docs/data-sources.md" className="text-primary hover:text-primary-dark font-medium">
              Read more →
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Technical Architecture</h2>
            <p className="text-gray-600 mb-4">
              Comprehensive overview of system architecture, components, and implementation details.
            </p>
            <Link href="https://github.com/Zeddli/SolanaFlowgraph/blob/main/docs/architecture.md" className="text-primary hover:text-primary-dark font-medium">
              Read more →
            </Link>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Innovations</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Health-Aware RPC Selection
              </h3>
              <p className="text-gray-700">
                Our platform continuously monitors the health of multiple RPC endpoints, tracking metrics such as latency, 
                error rates, and availability. Using a sophisticated scoring algorithm, the system automatically routes 
                requests to the healthiest endpoints, ensuring reliable data access even during network congestion.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Hybrid Graph Processing
              </h3>
              <p className="text-gray-700">
                Solana FlowGraph implements a dual-processing approach that combines real-time data handling with batch 
                analysis. This hybrid model allows for immediate visualization of new transactions while performing 
                deeper analysis and pattern recognition in the background, delivering both speed and depth of insights.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Context-Enhanced Visualization
              </h3>
              <p className="text-gray-700">
                Rather than displaying raw blockchain data, our visualization enriches nodes and connections with 
                contextual information about entities like programs, protocols, and wallet addresses. This approach 
                transforms abstract blockchain data into intuitive network graphs that reveal meaningful relationships 
                and patterns.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Adaptive Layout Algorithms
              </h3>
              <p className="text-gray-700">
                We've developed customized force-directed layout algorithms specifically optimized for blockchain 
                transaction visualization. These algorithms automatically adjust to different network topologies, 
                emphasizing key relationships while maintaining clarity even with complex transaction networks.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Architecture Overview</h2>
          
          <div className="overflow-auto">
            <pre className="text-xs md:text-sm bg-gray-100 p-4 rounded">
{`┌─────────────────────────────────────────────────────────────────┐
│                      Client Applications                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  Web UI      │   │  Mobile View │   │  Public API Consumers│ │
│  └──────────────┘   └──────────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST/GraphQL/WebSockets
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  REST API    │   │  GraphQL API  │   │  WebSocket API    │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal Service Communication
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Ingestion   │   │  Processing   │   │  Visualization    │   │
│  │  Service     │   │  Service      │   │  Service          │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Health      │   │  Analytics    │   │  Search           │   │
│  │  Monitor     │   │  Service      │   │  Service          │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Data Access Layer
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Storage Layer                             │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Time-Series │   │  Graph        │   │  Relational       │   │
│  │  Database    │   │  Database     │   │  Database         │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐                           │
│  │  Cache       │   │  File         │                           │
│  │  (Redis)     │   │  Storage      │                           │
│  └──────────────┘   └───────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ External Data Access
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        External Data Sources                     │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Solana RPC  │   │  Solscan API  │   │  Helius API       │   │
│  │  Nodes       │   │               │   │                   │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>
          
          <div className="mt-6">
            <p className="text-gray-700 mb-4">
              Solana FlowGraph is built with a modular, scalable architecture designed to handle real-time blockchain 
              data processing, storage, and visualization. The system is composed of several layers that work together 
              to provide a seamless experience for exploring and analyzing Solana blockchain data.
            </p>
            <p className="text-gray-700">
              For comprehensive architectural details, including component interactions, implementation specifics, 
              and deployment considerations, visit our complete <Link href="/documentation/architecture" className="text-primary hover:underline">architecture documentation</Link>.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Collection Methodology</h2>
          
          <div className="space-y-6">
            <p className="text-gray-700">
              Our platform collects data from multiple reliable sources with fallback mechanisms to ensure data 
              availability and integrity:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Primary Data Sources</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Solana RPC Nodes (Mainnet/Testnet/Devnet)</li>
                  <li>Solana Tracker API</li>
                  <li>Solscan API</li>
                  <li>Helius RPC API</li>
                  <li>On-Chain Programs</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Health-Aware Collection</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Monitors RPC endpoint health metrics</li>
                  <li>Automated failover mechanisms</li>
                  <li>Rate limiting and backoff strategies</li>
                  <li>Circuit breaker patterns</li>
                </ul>
              </div>
            </div>
            
            <p className="text-gray-700">
              For a detailed explanation of our data sources, collection methodologies, and visualization techniques, 
              visit our complete <Link href="/documentation/data-sources" className="text-primary hover:underline">data methodology documentation</Link>.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Configuration & Troubleshooting</h2>
          
          <div className="space-y-6">
            <p className="text-gray-700">
              Solana FlowGraph integrates with multiple external APIs to fetch and process blockchain data. Here's how to configure and troubleshoot common issues:
            </p>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">API Key Requirements</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Solana Tracker API</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Required for advanced wallet visualization</li>
                    <li>Obtain from <a href="https://solanatracker.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solana Tracker website</a></li>
                    <li>Configure in the .env.local file or enter directly in the visualization interface</li>
                    <li>Format: Alphanumeric string (typically 32+ characters)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Helius RPC API</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Used for wallet transaction tracking with enhanced metadata</li>
                    <li>Obtain from <a href="https://helius.xyz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Helius website</a></li>
                    <li>Configure in the .env.local file as NEXT_PUBLIC_HELIUS_API_KEY</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Solscan API</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Used for transaction data with program information</li>
                    <li>Obtain from <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solscan website</a></li>
                    <li>Configure in the .env.local file as NEXT_PUBLIC_SOLSCAN_API_KEY</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Troubleshooting Common API Issues</h3>
              
              <div className="bg-gray-50 p-5 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">401 Unauthorized Errors</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Check that the API key is correctly entered without typos or extra spaces</li>
                  <li>Verify that your API key is active and has not expired</li>
                  <li>Ensure you have sufficient credits or quota remaining</li>
                  <li>Try regenerating a new API key if problems persist</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">429 Rate Limit Errors</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>You've exceeded the allowed number of requests in a given timeframe</li>
                  <li>Implement backoff strategy or wait before trying again</li>
                  <li>Consider upgrading to a higher tier API plan if needed</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Fallback Options</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Use mock data for development and testing without API keys</li>
                  <li>Set NEXT_PUBLIC_USE_MOCK_DATA=true in your .env.local file</li>
                  <li>The system will automatically fall back to alternative data sources if primary sources fail</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Environment Configuration</h4>
              <p className="text-blue-700 mb-3">
                Create a <code className="bg-blue-100 px-1 py-0.5 rounded">.env.local</code> file in your project root with the following variables:
              </p>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded text-sm overflow-x-auto">
{`# API Keys for different Solana blockchain data providers
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your_solana_tracker_api_key_here
NEXT_PUBLIC_SOLSCAN_API_KEY=your_solscan_api_key_here
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here

# Enable/disable mock data for development
NEXT_PUBLIC_USE_MOCK_DATA=true`}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
