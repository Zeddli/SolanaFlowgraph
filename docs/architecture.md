# Architecture Documentation

## System Overview

Solana FlowGraph is built with a modular, scalable architecture designed to handle real-time blockchain data processing, storage, and visualization. The architecture consists of several key layers that work together to provide a seamless experience for visualizing and analyzing Solana blockchain data.

```
┌─────────────────────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Client Applications

The presentation layer includes:

- **Web UI**: Next.js-based web application with React for component rendering
- **Mobile View**: Responsive design optimized for mobile devices
- **Public API Consumers**: Third-party applications that consume our API

Technologies:
- Next.js framework for server-rendered React applications
- Tailwind CSS for styling
- D3.js for interactive visualizations
- React Query for data fetching and caching

### 2. API Gateway Layer

The API Gateway serves as the entry point for all client requests:

- **REST API**: Traditional REST endpoints for CRUD operations
- **GraphQL API**: Flexible query language for complex data requests
- **WebSocket API**: Real-time updates and subscriptions

Technologies:
- Express.js for REST API
- Apollo Server for GraphQL
- Socket.io for WebSockets
- JWT for authentication

### 3. Service Layer

The service layer contains our core business logic:

- **Ingestion Service**: Collects blockchain data from various sources
- **Processing Service**: Transforms and enriches raw blockchain data
- **Visualization Service**: Prepares data for visual representation
- **Health Monitor**: Tracks the health of RPC endpoints and other services
- **Analytics Service**: Performs statistical analysis on blockchain data
- **Search Service**: Indexes and searches blockchain data

Technologies:
- Node.js for service runtime
- TypeScript for type safety
- Bull.js for job queues
- Jest for unit testing

### 4. Storage Layer

Our hybrid storage approach includes:

- **Time-Series Database**: For historical transaction data (TimescaleDB)
- **Graph Database**: For relationship modeling (Neo4j)
- **Relational Database**: For structured data (PostgreSQL)
- **Cache**: For frequently accessed data (Redis)
- **File Storage**: For large datasets and exports

### 5. External Data Sources

We integrate with multiple external data sources:

- **Solana RPC Nodes**: Primary source for blockchain data
- **Solscan API**: Additional transaction metadata
- **Helius API**: Enhanced transaction data and parsing

## Technical Implementation Details

### Health Monitoring System

The Health Monitor continuously checks the status of RPC endpoints and other services:

```typescript
class HealthMonitor {
  private dataSources: Map<string, DataSourceHealth>;
  
  constructor() {
    this.dataSources = new Map();
  }
  
  async checkHealth(): Promise<void> {
    // For each data source, check its health
    Array.from(this.dataSources.entries()).forEach(async ([id, source]) => {
      try {
        const startTime = Date.now();
        const response = await fetch(source.endpoint);
        const endTime = Date.now();
        
        // Update health metrics
        source.latency = endTime - startTime;
        source.available = response.ok;
        source.lastChecked = new Date();
        source.consecutiveErrors = response.ok ? 0 : source.consecutiveErrors + 1;
      } catch (error) {
        source.available = false;
        source.consecutiveErrors += 1;
        source.lastError = error.message;
      }
    });
  }
  
  getHealthyDataSources(): DataSourceHealth[] {
    const healthySources: DataSourceHealth[] = [];
    
    // Filter and sort by health score
    Array.from(this.dataSources.entries()).forEach(([id, source]) => {
      if (source.available && source.consecutiveErrors === 0) {
        healthySources.push(source);
      }
    });
    
    return healthySources.sort((a, b) => a.latency - b.latency);
  }
}
```

### Data Processing Pipeline

The Processing Service transforms raw blockchain data into our standardized format:

```typescript
async function processTransaction(txData: RawTransactionData): Promise<ProcessedTransaction> {
  // Extract basic transaction info
  const { signature, slot, blockTime } = txData;
  
  // Process instructions to determine transaction type
  const instructions = parseInstructions(txData.message);
  const type = determineTransactionType(instructions);
  
  // Extract token transfers if present
  const tokenTransfers = extractTokenTransfers(txData);
  
  // Calculate fee in SOL
  const fee = txData.meta.fee / 1e9;
  
  // Determine transaction status
  const success = txData.meta.err === null;
  
  return {
    signature,
    slot,
    blockTime,
    timestamp: blockTime * 1000, // Convert to milliseconds
    type,
    fee,
    success,
    instructions: instructions.map(formatInstruction),
    tokenTransfers,
    fromAddress: determineMainSender(txData),
    toAddress: determineMainRecipient(txData)
  };
}
```

### Visualization Data Preparation

The Visualization Service prepares data for graph visualization:

```typescript
function prepareGraphData(transactions: ProcessedTransaction[]): GraphData {
  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeMap = new Map<string, Node>();
  
  // First pass: create nodes for all unique addresses
  transactions.forEach(tx => {
    // Add sender node if it doesn't exist
    if (!nodeMap.has(tx.fromAddress)) {
      const node: Node = {
        id: tx.fromAddress,
        label: shortenAddress(tx.fromAddress),
        group: 1, // Wallet type
        value: 10 // Base size
      };
      nodeMap.set(tx.fromAddress, node);
      nodes.push(node);
    }
    
    // Add recipient node if it doesn't exist
    if (!nodeMap.has(tx.toAddress)) {
      const node: Node = {
        id: tx.toAddress,
        label: shortenAddress(tx.toAddress),
        group: 1, // Wallet type
        value: 10 // Base size
      };
      nodeMap.set(tx.toAddress, node);
      nodes.push(node);
    }
    
    // Second pass: add program nodes and links
    tx.instructions.forEach(instruction => {
      const programId = instruction.programId;
      
      // Add program node if it doesn't exist
      if (!nodeMap.has(programId)) {
        const node: Node = {
          id: programId,
          label: getProgramName(programId) || shortenAddress(programId),
          group: 2, // Program type
          value: 15 // Slightly larger
        };
        nodeMap.set(programId, node);
        nodes.push(node);
      }
      
      // Add links between addresses and programs
      links.push({
        source: tx.fromAddress,
        target: programId,
        value: 1 // Base weight
      });
    });
    
    // Add direct link between sender and recipient
    links.push({
      source: tx.fromAddress,
      target: tx.toAddress,
      value: calculateLinkWeight(tx) // Based on SOL amount or importance
    });
  });
  
  return { nodes, links };
}
```

## Deployment Architecture

Solana FlowGraph is deployed using a containerized approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                            │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Web Pods    │   │  API Pods     │   │  Service Pods     │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────────┐   │
│  │  Database    │   │  Cache        │   │  Storage          │   │
│  │  Stateful Set│   │  Stateful Set │   │  Persistent Volume│   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- **Docker**: All services are containerized for consistent deployment
- **Kubernetes**: Orchestration for scaling and management
- **Helm**: Package management for Kubernetes deployments
- **GitHub Actions**: CI/CD pipeline for automated testing and deployment

## Security Considerations

1. **API Authentication**: JWT-based authentication for API access
2. **Rate Limiting**: Prevent abuse through request throttling
3. **Input Validation**: Strict validation of all user inputs
4. **Data Encryption**: Encryption for sensitive data at rest and in transit
5. **Dependency Scanning**: Regular scanning of dependencies for vulnerabilities

## Performance Optimizations

1. **Query Caching**: Redis-based caching for frequently accessed data
2. **Data Indexing**: Strategic indexes on database collections
3. **Edge Caching**: CDN for static assets and common API responses
4. **Lazy Loading**: On-demand loading of visualization data
5. **Data Aggregation**: Pre-computed aggregates for common analytics queries

## Extensibility

The architecture is designed to be extended through:

1. **Plugin System**: Custom data sources and visualizations
2. **API Hooks**: Integration points for third-party applications
3. **Event System**: Publish-subscribe pattern for internal communication
4. **Feature Flags**: Gradual rollout of new features 