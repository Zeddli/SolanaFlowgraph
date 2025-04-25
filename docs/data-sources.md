# Data Sources & Methodology

## Data Sources

Solana FlowGraph collects and visualizes blockchain data from multiple reliable sources with fallback mechanisms to ensure data availability and reliability even when primary sources are unavailable.

### Primary Data Sources

1. **Solana RPC Nodes**
   - **Direct Node Access**: Connections to Solana validators for real-time transaction data
   - **Network Types**:
     - Mainnet nodes for production data
     - Testnet/Devnet nodes for development and testing
     - Custom RPC endpoints with rate limiting consideration
   - **Data Retrieved**:
     - Block information
     - Transaction details
     - Account data
     - Program interaction data

2. **Third-party APIs**
   - **Solana Tracker API**
     - Comprehensive wallet-centric data
     - Transaction history with detailed metadata
     - Token balance information and historical values
     - Requires API key configured via `NEXT_PUBLIC_SOLANA_TRACKER_API_KEY`
   
   - **Solscan API**
     - Transaction data with program information
     - Account details and labels
     - Token metadata and price information
     - Accessible via `NEXT_PUBLIC_SOLSCAN_API_KEY`
   
   - **Helius RPC API**
     - Enhanced RPC service with additional metadata
     - Specialized transaction parsing
     - DAS-compliant data structures
     - Configured via `NEXT_PUBLIC_HELIUS_API_KEY`

3. **On-Chain Programs**
   - Direct interaction with on-chain programs for real-time data
   - Program account data for detailed instruction parsing
   - Metadata fetching from on-chain sources

4. **Local Cache**
   - Redis for temporary caching of frequently accessed data
   - Browser storage for client-side caching to reduce API calls
   - Memory cache for high-frequency data access patterns

### Sample and Testing Data

1. **Mock Data Generation**
   - Procedurally generated test data for development and demos
   - Configurable parameters for different network topologies
   - Enabled via `NEXT_PUBLIC_USE_MOCK_DATA=true`

2. **Historical Datasets**
   - Pre-processed transaction datasets for testing and analysis
   - Public Solana blockchain datasets:
     - [Kaggle Solana Blockchain Dataset](https://www.kaggle.com/datasets/thedevastator/solana-blockchain-dataset)
     - Dune Analytics data exports

3. **Development Fixtures**
   - Static JSON datasets for consistent unit testing
   - Representative transaction samples for different use cases
   - Controlled environment for UI/UX testing

## Data Collection Methodology

### Multi-Provider Strategy

Solana FlowGraph implements a sophisticated multi-provider data strategy that:

1. **Prioritizes Data Sources**
   - Primary source: Solana Tracker API when available
   - Secondary: Solscan API with automatic fallback
   - Tertiary: Direct RPC node access when needed
   - Final fallback: Mock data for demonstration

2. **Handles API Authentication**
   - Secure API key management through environment variables
   - Runtime validation of API credentials
   - Graceful degradation when credentials are invalid

3. **Manages Rate Limiting**
   - Respects provider-specific rate limits
   - Implements request throttling and batching
   - Uses exponential backoff for retry logic

### Health-Aware Data Collection

Our health-aware data collection system continuously:

1. **Monitors RPC Endpoint Health**
   - Tracks latency, error rates, and availability
   - Scores endpoints based on health metrics
   - Automatically switches to healthier endpoints when issues are detected

2. **Implements Fallback Mechanisms**
   - Primary, secondary, and tertiary data sources configured
   - Automatic failover when primary sources are unavailable
   - Circuit breaker patterns to prevent cascade failures

3. **Optimizes Resource Usage**
   - Balances request load across endpoints
   - Implements caching strategies appropriate to data volatility
   - Reduces redundant API calls through smart scheduling

### Data Processing Pipeline

#### 1. Ingestion Layer
- Connects to Solana RPC nodes and APIs
- Subscribes to real-time transaction streams when available
- Fetches historical transaction data for backfilling
- Validates incoming data for consistency and completeness

#### 2. Normalization Layer
- Transforms raw blockchain data into standardized format
- Resolves wallet names and labels when possible
- Enriches data with additional metadata from multiple sources
- Categorizes transactions by type and intent
- Extracts meaningful relationship data

#### 3. Storage Layer
- Hybrid storage approach combining:
  - Time-series database for historical queries and trends
  - Graph database for relationship modeling and path analysis
  - Indexed blockchain data for fast lookups and searches
  - In-memory caching for frequently accessed data

#### 4. Query Layer
- Optimized query interfaces for different visualization needs
- Aggregation functions for statistical analysis
- Filtering capabilities for focused exploration
- Real-time subscriptions for dashboard updates

## Data Visualization Methodology

### Graph Construction

1. **Node Representation**
   - **Wallets**: Represented as primary nodes with distinct visual styling
   - **Programs**: Shown as interaction nodes with program-specific identifiers
   - **Protocols**: Grouped nodes representing DeFi and other on-chain protocols
   - **Tokens**: Special nodes for tracking token transfers and balances

2. **Edge Weighting**
   - Transaction value determines edge thickness for visual prominence
   - Transaction frequency influences edge appearance
   - Edge direction shows fund flow direction
   - Edge styling indicates transaction type

3. **Layout Algorithms**
   - Force-directed graph layout for natural clustering of related entities
   - Hierarchical layouts for program invocation flows
   - Radial layouts for wallet-centric views
   - Customized physics parameters for optimal node spacing

### Interactive Elements

1. **Navigation Controls**
   - Zoom and pan with intuitive mouse/touch controls
   - Multiple zoom levels showing different detail granularity
   - Context-preserving navigation between related entities
   - Focused views on selected nodes with detail panels

2. **Data Filtering**
   - Real-time filtering by transaction type, size, and time
   - Time-range selection for temporal analysis
   - Value thresholds for focusing on significant transactions
   - Entity-type filtering (wallets, programs, tokens, etc.)
   - Program and wallet address search with auto-completion

3. **Progressive Disclosure**
   - On-demand loading of related transactions
   - Expandable node details showing contextual information
   - Temporal expansion to show transaction history
   - Connected entity discovery through graph traversal

## Data Integration & Extensibility

1. **API Integration Pattern**
   - Modular adapter pattern for data source integration
   - Standardized response transformation
   - Consistent error handling across providers
   - Configurable timeout and retry policies

2. **Custom Data Source Support**
   - Pluggable architecture for adding new data sources
   - Interface-based design for data provider implementations
   - Configuration-driven source selection
   - Validation mechanisms for data integrity

3. **Export Capabilities**
   - Graph data export in multiple formats (JSON, CSV)
   - Visualization snapshots for reporting
   - Raw data access for custom analysis
   - Integration hooks for external tools

## Data Integrity & Privacy

1. **Accuracy Measures**
   - Cross-validation across multiple data sources
   - Consistency checks for transaction data
   - Anomaly detection for potentially incorrect data
   - Version tracking for data provenance

2. **Privacy Considerations**
   - Processing of publicly available on-chain data only
   - No collection of personally identifiable information
   - Optional local-only processing for sensitive analysis
   - Configurable data retention policies

3. **Transparency**
   - Open documentation of data sources and methods
   - Clear indication of estimated vs. actual data
   - Attribution to original data sources
   - Disclosure of data limitations and potential inaccuracies 