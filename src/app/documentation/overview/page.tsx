import React from 'react';
import Header from '../../components/Header';
import Link from 'next/link';

export const metadata = {
  title: 'Project Overview | Solana FlowGraph Documentation',
  description: 'Design rationale, key features, and potential impact of the Solana FlowGraph project',
};

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/documentation" className="text-primary hover:underline text-sm font-medium">
              ← Back to Documentation
            </Link>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Solana FlowGraph: Project Overview</h1>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Executive Summary</h2>
              <p className="text-gray-700 mb-4">
                Solana FlowGraph is an advanced blockchain visualization platform designed to map and explore Solana blockchain data in an interactive, user-friendly manner. The project addresses critical challenges in blockchain data analysis by providing intuitive visualizations, real-time monitoring, and robust data processing capabilities.
              </p>
              <p className="text-gray-700">
                Our solution enables investigators, developers, and everyday users to navigate the complex web of Solana transactions, uncover patterns, track fund flows, and monitor on-chain activity through interactive graph visualizations and comprehensive analytics.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Problem Statement</h2>
              <p className="text-gray-700 mb-4">
                Solana, while offering high throughput and low transaction costs, presents unique challenges for on-chain analysis:
              </p>
              <ol className="list-decimal pl-5 space-y-3 text-gray-700 mb-4">
                <li>
                  <strong>Complex Transaction Structures</strong>: Solana transactions can contain multiple instructions, program invocations, and account references, making them difficult to interpret without specialized tools.
                </li>
                <li>
                  <strong>Data Accessibility & Real-Time Analysis</strong>: Accessing and analyzing blockchain data in real-time is challenging due to network congestion, API limitations, and the sheer volume of transactions.
                </li>
                <li>
                  <strong>Network Stability & Reliability</strong>: Solana's network occasionally experiences congestion and downtime, creating gaps in data collection and analysis.
                </li>
              </ol>
              <p className="text-gray-700">
                Traditional blockchain explorers provide basic transaction details but lack the depth, context, and visualization capabilities needed for complex investigations and pattern recognition.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Design Rationale</h2>
              <p className="text-gray-700 mb-4">
                Our design approach focuses on three core principles:
              </p>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Intuitive Visual Representation</h3>
                <p className="text-gray-700 mb-3">
                  We chose a graph-based visualization approach because:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Natural Representation</strong>: Blockchain transactions inherently form a network of interactions</li>
                  <li><strong>Pattern Recognition</strong>: Humans excel at identifying visual patterns compared to parsing raw data</li>
                  <li><strong>Context Preservation</strong>: Graph visualizations maintain relationships between entities</li>
                  <li><strong>Scalability</strong>: Interactive features like zooming, filtering, and focusing allow exploration of large datasets</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Resilient Architecture</h3>
                <p className="text-gray-700 mb-3">
                  Our architecture is designed to handle the challenges of Solana data collection:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Health-Aware Data Collection</strong>: Monitoring endpoint health ensures reliable data sourcing</li>
                  <li><strong>Hybrid Storage Model</strong>: Combining time-series and graph databases optimizes for different query patterns</li>
                  <li><strong>Fallback Mechanisms</strong>: Multiple data sources with automatic failover increase reliability</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3. User-Centric Experience</h3>
                <p className="text-gray-700 mb-3">
                  We prioritized user experience through:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Progressive Disclosure</strong>: Starting with high-level overviews and allowing drill-down for details</li>
                  <li><strong>Contextual Information</strong>: Providing relevant information about entities without overwhelming users</li>
                  <li><strong>Multiple Visualization Modes</strong>: Different views (graph, timeline, heatmap) to support various analysis needs</li>
                  <li><strong>Cross-Platform Accessibility</strong>: Responsive design works across devices</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Features</h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Interactive Graph Visualization</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Force-Directed Layouts</strong>: Automatically arranges nodes based on relationships</li>
                  <li><strong>Node Categorization</strong>: Different colors and shapes for wallet addresses, programs, and protocols</li>
                  <li><strong>Edge Weighting</strong>: Line thickness represents transaction value or frequency</li>
                  <li><strong>Zoom & Pan</strong>: Navigate through complex transaction networks</li>
                  <li><strong>Node Selection</strong>: Click nodes to view detailed information</li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Health-Aware Data Ingestion</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Endpoint Monitoring</strong>: Tracks the health of RPC endpoints</li>
                  <li><strong>Automatic Failover</strong>: Switches to healthy endpoints when issues are detected</li>
                  <li><strong>Backfill Capability</strong>: Detects and fills gaps in transaction history</li>
                  <li><strong>Multi-Provider Integration</strong>: Aggregates data from multiple sources</li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">3. Customizable Analysis Tools</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Time Range Selection</strong>: Analyze transactions within specific time periods</li>
                  <li><strong>Value Filters</strong>: Focus on transactions above or below certain thresholds</li>
                  <li><strong>Address Tracking</strong>: Monitor specific wallet addresses</li>
                  <li><strong>Program Filtering</strong>: Focus on specific smart contract interactions</li>
                  <li><strong>Pattern Detection</strong>: Highlight common transaction patterns</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Wallet Transaction Tracking</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li><strong>Transaction History</strong>: View and filter transaction history for any wallet</li>
                  <li><strong>Value Flows</strong>: Track inflows and outflows of SOL and tokens</li>
                  <li><strong>Connection Analysis</strong>: Identify frequently connected addresses</li>
                  <li><strong>Protocol Interactions</strong>: Analyze interactions with DeFi protocols and applications</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Potential Impact</h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">For Investigators</h3>
                <ol className="list-decimal pl-5 space-y-3 text-gray-700">
                  <li>
                    <strong>Enhanced Forensic Capabilities</strong>: Solana FlowGraph provides a powerful tool for tracing funds, identifying suspicious patterns, and linking transactions across complex networks.
                  </li>
                  <li>
                    <strong>Accelerated Investigations</strong>: Visual patterns and contextual data reduce the time needed to analyze transaction flows, allowing for faster identification of relevant information.
                  </li>
                  <li>
                    <strong>Improved Documentation</strong>: Visualization snapshots can be exported for inclusion in reports and presentations, providing clear evidence of transaction flows.
                  </li>
                </ol>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">For Developers</h3>
                <ol className="list-decimal pl-5 space-y-3 text-gray-700">
                  <li>
                    <strong>Application Monitoring</strong>: Monitor the usage and performance of on-chain applications in real-time.
                  </li>
                  <li>
                    <strong>Bug Detection</strong>: Identify unexpected transaction patterns that may indicate bugs or exploits.
                  </li>
                  <li>
                    <strong>User Experience Analysis</strong>: Understand how users interact with protocols and optimize accordingly.
                  </li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">For Protocol Users</h3>
                <ol className="list-decimal pl-5 space-y-3 text-gray-700">
                  <li>
                    <strong>Transaction Verification</strong>: Confirm that transactions behaved as expected through visual verification.
                  </li>
                  <li>
                    <strong>Portfolio Analysis</strong>: Track interactions with different protocols and applications.
                  </li>
                  <li>
                    <strong>Educational Tool</strong>: Learn about blockchain mechanics through interactive visualizations.
                  </li>
                </ol>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Technical Innovation</h2>
              <p className="text-gray-700 mb-4">
                Solana FlowGraph introduces several innovative approaches:
              </p>
              <ol className="list-decimal pl-5 space-y-3 text-gray-700">
                <li>
                  <strong>Health-Aware RPC Selection</strong>: Dynamic scoring and selection of RPC endpoints based on performance metrics.
                </li>
                <li>
                  <strong>Hybrid Graph Processing</strong>: Combining real-time processing with batch analysis for optimal performance.
                </li>
                <li>
                  <strong>Context-Enhanced Visualization</strong>: Augmenting raw blockchain data with contextual information about programs, protocols, and wallet entities.
                </li>
                <li>
                  <strong>Adaptive Layout Algorithms</strong>: Customized force-directed layouts optimized for blockchain transaction visualization.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Conclusion</h2>
              <p className="text-gray-700 mb-4">
                Solana FlowGraph represents a significant advancement in blockchain visualization and analysis tools, specifically designed for Solana's unique architecture and challenges. By combining robust data processing with intuitive visualizations, we enable users to navigate the complexity of blockchain data and extract meaningful insights.
              </p>
              <p className="text-gray-700">
                As the Solana ecosystem continues to grow, tools like Solana FlowGraph will play an increasingly important role in maintaining transparency, security, and usability of the blockchain.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 