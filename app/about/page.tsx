'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Book, Code, Database, BarChart2, Shield } from 'lucide-react';
import Header from '../components/Header';

// Note: You need to install lucide-react:
// npm install lucide-react
// For now, we'll use simple div placeholders for icons

export default function AboutPage() {
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold text-center mb-8">About Solana FlowGraph</h1>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Project Overview</h2>
          <p className="text-lg mb-4">
            Solana FlowGraph is an advanced blockchain visualization platform designed to map and explore 
            Solana blockchain data in an interactive, user-friendly manner. The project addresses critical 
            challenges in blockchain data analysis through intuitive visualizations, real-time monitoring, 
            and robust data processing capabilities.
          </p>
          <p className="text-lg mb-4">
            Our solution enables investigators, developers, and everyday users to navigate the complex web of 
            Solana transactions, uncover patterns, track fund flows, and monitor on-chain activity through 
            interactive graph visualizations and comprehensive analytics.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-8 h-8 text-purple-600 mb-4 flex items-center justify-center">
              <Github size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Open Source</h3>
            <p className="mb-4">
              Solana FlowGraph is an open-source project available on GitHub. We welcome contributors 
              to help improve and expand the platform.
            </p>
            <a 
              href="https://github.com/Zeddli/SolanaFlowgraph" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              View on GitHub →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-8 h-8 text-purple-600 mb-4 flex items-center justify-center">
              <Book size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Documentation</h3>
            <p className="mb-4">
              Comprehensive documentation is available to help you understand and use the platform effectively.
            </p>
            <Link 
              href="/documentation" 
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              View Documentation →
            </Link>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="w-6 h-6 text-purple-600 mb-2 flex items-center justify-center">
                <Code size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2">Interactive Visualization</h3>
              <p>Explore Solana transactions through intuitive, interactive graph visualizations.</p>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <div className="w-6 h-6 text-purple-600 mb-2 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2">Health-Aware Ingestion</h3>
              <p>Fault-tolerant data collection with automatic failover between data sources.</p>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <div className="w-6 h-6 text-purple-600 mb-2 flex items-center justify-center">
                <Database size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2">Hybrid Storage</h3>
              <p>Combine time-series and graph databases for optimal data access patterns.</p>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <div className="w-6 h-6 text-purple-600 mb-2 flex items-center justify-center">
                <BarChart2 size={20} />
              </div>
              <h3 className="text-lg font-medium mb-2">Real-Time Analytics</h3>
              <p>Analyze transaction patterns, program usage, and wallet interactions as they happen.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Technical Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-gray-100 p-3 rounded-lg mb-2 flex items-center justify-center">
                <span className="font-medium text-black">Next.js</span>
              </div>
              <p className="text-sm font-medium">Next.js</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-100 p-3 rounded-lg mb-2 flex items-center justify-center">
                <span className="font-medium text-black">D3.js</span>
              </div>
              <p className="text-sm font-medium">D3.js</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-100 p-3 rounded-lg mb-2 flex items-center justify-center">
                <span className="font-medium text-black">TS</span>
              </div>
              <p className="text-sm font-medium">TypeScript</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gray-100 p-3 rounded-lg mb-2 flex items-center justify-center">
                <span className="font-medium text-black">Solana</span>
              </div>
              <p className="text-sm font-medium">Solana</p>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-4">Get Involved</h2>
          <p className="text-lg mb-6">
            Solana FlowGraph is an open-source project and we welcome contributions from the community.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <a 
              href="https://github.com/Zeddli/SolanaFlowgraph" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-md"
            >
              Star on GitHub
            </a>
            <a 
              href="https://github.com/Zeddli/SolanaFlowgraph/issues/new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white border border-purple-600 text-purple-600 hover:bg-purple-50 font-medium py-2 px-6 rounded-md"
            >
              Report an Issue
            </a>
          </div>
        </div>
      </div>
    </>
  );
} 
