# Solana FlowGraph Documentation

Welcome to the Solana FlowGraph documentation. This comprehensive guide provides detailed information about the architecture, data sources, methodologies, and features of our interactive Solana blockchain visualization platform.

## Documentation Sections

### 1. [Project Overview](./project-overview.md)
An introduction to Solana FlowGraph, including the problem statement, design rationale, key features, and potential impact for on-chain investigation.

### 2. [Data Sources & Methodology](./data-sources.md)
Detailed information about the data sources used, data collection methodologies, and visualization techniques employed in Solana FlowGraph.

### 3. [Architecture Documentation](./architecture.md)
Technical documentation covering the system architecture, component interactions, implementation details, and deployment considerations.

## Getting Started

If you're new to Solana FlowGraph, we recommend starting with the [Project Overview](./project-overview.md) to understand the core concepts and capabilities of the platform. Then, explore the interactive visualization features by visiting:

- **Visualization Dashboard**: [/visualization](/visualization)
- **Wallet Transaction Tracker**: [/wallet-tracker](/wallet-tracker)
- **Statistics & Analytics**: [/statistics](/statistics)

## Interactive Features

Solana FlowGraph offers several interactive features for exploring Solana blockchain data:

1. **Graph Visualization**: Interactive network graph showing relationships between wallets, programs, and transactions.
2. **Transaction Explorer**: View detailed information about individual transactions.
3. **Wallet Tracker**: Monitor and analyze wallet activity and transaction history.
4. **Statistics Dashboard**: Charts and metrics showing network activity, popular programs, and transaction volumes.

## Data Sources

Our platform collects data from multiple sources to ensure reliability and comprehensive coverage:

- **Solana RPC Nodes**: Primary source for blockchain data
- **Solscan API**: Additional transaction metadata
- **Helius API**: Enhanced transaction data and parsing
- **Solana Tracker API**: Detailed wallet and transaction data

For more information on how we collect, process, and visualize this data, see the [Data Sources & Methodology](./data-sources.md) documentation.

## Technical Stack

Solana FlowGraph is built using modern web technologies:

- **Frontend**: Next.js, React, Tailwind CSS, D3.js
- **Backend**: Node.js, TypeScript
- **Databases**: TimescaleDB (time-series), Neo4j (graph)
- **Infrastructure**: Docker, Kubernetes

For detailed information about the technical implementation, refer to the [Architecture Documentation](./architecture.md).

## Feedback and Contributions

We welcome feedback and contributions to improve Solana FlowGraph. Please visit our [GitHub repository](https://github.com/zeddli/solana-flowgraph) to submit issues, feature requests, or pull requests. 