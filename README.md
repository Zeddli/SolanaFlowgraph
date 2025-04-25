# Solana FlowGraph

A real-time Solana transaction visualization platform that provides insights into on-chain activities through interactive graphs and analytics.

## Overview

Solana FlowGraph is an on-chain data pipeline and visualization platform designed to handle Solana transactions in real-time. It addresses several key challenges:

1. **Complex Transaction Structures** - Solana transactions can be complex with multiple instructions and account interactions.
2. **Data Accessibility & Real-Time Analysis** - Accessing and analyzing Solana data in real-time can be challenging.
3. **Network Stability & Reliability** - Solana's network can experience congestion and occasional downtime.

## Features

- **Transaction Visualization** - Interactive graph visualization of Solana transactions, showing the flow of funds and program interactions.
- **Health-Aware Ingestion** - Fault-tolerant data ingestion system that monitors RPC endpoint health and automatically switches to healthy endpoints.
- **Hybrid Storage System** - Combination of time-series and graph databases for efficient storage and retrieval of transaction data.
- **Real-Time Analytics** - Analyze transaction patterns, program usage, and wallet interactions as they happen.
- **Backfill Capability** - Automatically detect and fill gaps in transaction history.
- **Wallet Transaction Tracking** - Track and visualize transaction history for any Solana wallet with multi-provider fallback for reliable data access.

## Documentation

For comprehensive documentation, please see the [docs directory](./docs):

- [Project Overview](./docs/project-overview.md) - Design rationale, key features, and potential impact
- [Data Sources & Methodology](./docs/data-sources.md) - Information on data sources and processing methodology
- [Architecture Documentation](./docs/architecture.md) - Technical details of the system architecture

## Architecture

Solana FlowGraph consists of several key components:

### Backend

- **Health Monitor** - Monitors the health of Solana RPC endpoints and prioritizes the healthiest ones for data ingestion.
- **Ingestion Service** - Connects to Solana nodes, fetches transaction data, and processes it for storage.
- **Storage System** - Hybrid storage combining:
  - Time-series storage (TimescaleDB) for historical queries and analytics
  - Graph storage (Neo4j) for relationship queries and visualizations
- **Backfill Queue** - Detects and fills gaps in transaction history.

### Frontend

- **Graph Visualization** - Interactive network graph showing relationships between wallets, programs, and transactions.
- **Transaction Explorer** - View detailed information about individual transactions.
- **Statistics Dashboard** - Charts and metrics showing network activity, popular programs, and transaction volumes.

## Getting Started

### Prerequisites

- Node.js (v16+)
- TypeScript
- Next.js
- (Optional) Docker for database containers

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Zeddli/SolanaFlowgraph
cd solana-flowgraph
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (create a `.env.local` file):

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using Docker (Optional)

For the full setup with TimescaleDB and Neo4j:

```bash
docker-compose up -d
```

## Usage

### Transaction Visualization

1. Navigate to the Visualization page
2. Enter a wallet address or transaction signature
3. Select the visualization type (Flow Graph, Program Interaction, etc.)
4. Explore the resulting graph by zooming, panning, and clicking on nodes

### Statistics and Analytics

1. Navigate to the Statistics page
2. View transaction volumes, active wallets, and popular programs
3. Filter by time range or specific programs

### Wallet Transaction Tracking

1. Navigate to the Wallet Tracker page
2. Enter a Solana wallet address in the search box
3. View the list of recent transactions for the wallet
4. Click on transaction signatures to view detailed information on Solana Explorer

#### API Configuration

The wallet tracking feature uses multiple data providers with automatic fallback:

1. Configure API keys in your `.env.local` file:
```
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your_key_here
NEXT_PUBLIC_SOLSCAN_API_KEY=your_key_here
NEXT_PUBLIC_HELIUS_API_KEY=your_key_here
```

2. For development with mock data:
```
NEXT_PUBLIC_USE_MOCK_DATA=true
```



## Development

### Project Structure

```
├── src/
│   ├── app/             # Next.js app pages
│   ├── backend/         # Backend services
│   │   ├── health/      # Health monitoring
│   │   ├── ingestion/   # Data ingestion
│   │   └── storage/     # Storage adapters
│   ├── components/      # React components
│   ├── lib/             # Shared utilities
│   └── styles/          # CSS and styling
├── public/              # Static assets
├── prisma/              # Database schema
├── docs/                # Documentation
└── docker/              # Docker configuration
```

### Running Tests

```bash
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgements

- [Solana Labs](https://solana.com) for the robust blockchain platform
- [D3.js](https://d3js.org) for powerful visualization capabilities
- The Solana developer community for their valuable resources and tools 
