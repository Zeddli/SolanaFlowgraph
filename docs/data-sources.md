# Data Sources & Methodology

## Data Sources

Solana FlowGraph collects and visualizes blockchain data from multiple reliable sources with fallback mechanisms to ensure data availability and reliability:

### Primary Data Sources

1. **Solana RPC Nodes**
   - Mainnet nodes for production data
   - Testnet/Devnet nodes for testing
   - Custom RPC endpoints with rate limiting consideration

2. **Third-party APIs**
   - **Solana Tracker API**: Used for detailed transaction history and wallet data
   - **Solscan API**: Provides transaction data with program information
   - **Helius RPC API**: Enhanced RPC service with additional metadata and parsing

3. **On-Chain Programs**
   - Direct interaction with on-chain programs for real-time data
   - Program account data for detailed instruction parsing

4. **Local Cache**
   - Redis for temporary caching of frequently accessed data
   - Browser storage for client-side caching to reduce API calls

## Data Collection Methodology

### Sample Data Source
1. **Solana Historical Data**
   - https://www.kaggle.com/datasets/thedevastator/solana-blockchain-dataset

2. **Solana Transaction by Fee Type**
   - https://dune.com/queries/4314353

3. **Solana Transaction Filter**
   - https://dune.com/queries/2660040

4. **Solana Transaction by Fee Type by Program (last 48 hours, top 1000 programs)**
   - https://dune.com/queries/4314734

### Health-Aware Data Collection

Solana FlowGraph uses a health-aware data collection system that:

1. **Monitors RPC Endpoint Health**
   - Tracks latency, error rates, and availability
   - Scores endpoints based on health metrics
   - Automatically switches to healthier endpoints when issues are detected

2. **Fallback Mechanisms**
   - Primary, secondary, and tertiary data sources configured
   - Automatic failover when primary sources are unavailable
   - Circuit breaker patterns to prevent cascade failures

3. **Rate Limiting & Backoff**
   - Respects API rate limits through throttling
   - Implements exponential backoff for retries
   - Distributes load across multiple endpoints

### Data Processing Pipeline

#### 1. Ingestion Layer
- Connects to Solana RPC nodes and APIs
- Subscribes to real-time transaction streams when available
- Fetches historical transaction data for backfilling
- Validates incoming data for consistency

#### 2. Normalization Layer
- Transforms raw blockchain data into standardized format
- Resolves wallet names when possible
- Enriches data with additional metadata
- Categorizes transactions by type and intent

#### 3. Storage Layer
- Hybrid storage approach combining:
  - Time-series database for historical queries
  - Graph database for relationship modeling
  - Indexed blockchain data for fast lookups

#### 4. Query Layer
- Optimized query interfaces for different visualization needs
- Aggregation functions for statistical analysis
- Real-time subscriptions for dashboard updates

## Data Visualization Methodology

### Graph Construction

1. **Node Representation**
   - Wallets represented as primary nodes
   - Programs as interaction nodes
   - Transactions as edge attributes
   - Protocols as grouped nodes

2. **Edge Weighting**
   - Transaction value determines edge thickness
   - Transaction frequency influences edge prominence
   - Edge direction shows fund flow

3. **Layout Algorithms**
   - Force-directed graph for natural clustering
   - Hierarchical layouts for program invocation flows
   - Radial layouts for wallet-centric views

### Interactive Elements

1. **Zooming & Panning**
   - Multiple zoom levels showing different detail granularity
   - Context-preserving navigation
   - Focused views on selected nodes

2. **Filtering & Search**
   - Real-time filtering by transaction type
   - Time-range selection for temporal analysis
   - Value thresholds for significant transaction focus
   - Program and wallet address search

3. **Node Expansion**
   - On-demand loading of related transactions
   - Progressive disclosure of complex relationships
   - Temporal expansion to show transaction history

## Data Integrity & Privacy

1. **Accuracy Measures**
   - Cross-validation across multiple data sources
   - Consistency checks for transaction data
   - Anomaly detection for potentially incorrect data

2. **Privacy Considerations**
   - Processing of publicly available on-chain data only
   - No collection of personally identifiable information
   - Optional local-only processing for sensitive analysis

3. **Transparency**
   - Open documentation of data sources and methods
   - Clear indication of estimated vs. actual data
   - Attribution to original data sources 