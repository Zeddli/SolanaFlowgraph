# Deployment Guide

This guide provides comprehensive instructions for deploying the Solana FlowGraph visualization platform in various environments, from local development to production systems.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Configuration](#database-configuration)
5. [Deployment Options](#deployment-options)
   - [Vercel Deployment](#vercel-deployment)
   - [Docker Deployment](#docker-deployment)
   - [Traditional Hosting](#traditional-hosting)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying Solana FlowGraph, ensure you have the following prerequisites:

### Development Tools

- **Node.js**: Version 16.x or higher
- **npm** or **yarn**: For package management
- **Git**: For version control
- **Docker** (optional): For containerized deployment

### API Keys

- **Solana Tracker API Key**: For primary transaction data (obtain from [solanatracker.io/data-api](https://www.solanatracker.io/data-api))
- **Solscan API Key** (optional): For fallback data source (obtain from [solscan.io](https://solscan.io))
- **Helius API Key** (optional): For enhanced data (obtain from [helius.xyz](https://helius.xyz))

### System Requirements

- **CPU**: 2+ cores recommended for optimal performance
- **RAM**: Minimum 2GB, 4GB+ recommended for production
- **Storage**: Minimum 1GB for application, additional space needed for databases
- **Network**: Stable internet connection with good bandwidth for API communication

## Local Development Setup

Follow these steps to set up a local development environment:

### 1. Clone the Repository

```bash
git clone https://github.com/Zeddli/SolanaFlowgraph.git
cd solana-flowgraph
```

### 2. Install Dependencies

```bash
npm install
# or with yarn
yarn install
```

### 3. Create Environment Configuration

Create a `.env.local` file in the root directory with your environment variables:

```
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your_solana_tracker_api_key
NEXT_PUBLIC_SOLSCAN_API_KEY=your_solscan_api_key
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_NETWORK=mainnet
```

### 4. Run the Development Server

```bash
npm run dev
# or with yarn
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Environment Configuration

The Solana FlowGraph application uses environment variables for configuration. Below is a comprehensive list of available configuration options:

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_SOLANA_TRACKER_API_KEY` | Solana Tracker API authentication key | - | Yes |
| `NEXT_PUBLIC_SOLSCAN_API_KEY` | Solscan API authentication key | - | No |
| `NEXT_PUBLIC_HELIUS_API_KEY` | Helius API authentication key | - | No |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | URL for Solana RPC node | https://api.mainnet-beta.solana.com | No |
| `NEXT_PUBLIC_NETWORK` | Solana network (mainnet, testnet, devnet) | mainnet | No |

### Feature Flags

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_USE_MOCK_DATA` | Use mock data instead of live API data | false | No |
| `NEXT_PUBLIC_ENABLE_REAL_TIME` | Enable real-time data updates | true | No |
| `NEXT_PUBLIC_MAX_NODES` | Maximum number of nodes to display in graph | 500 | No |

### Performance Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_CACHE_DURATION` | Cache duration in seconds | 300 | No |
| `NEXT_PUBLIC_REQUEST_TIMEOUT` | API request timeout in milliseconds | 10000 | No |
| `NEXT_PUBLIC_RETRY_ATTEMPTS` | Number of retry attempts for failed requests | 3 | No |

## Database Configuration

Solana FlowGraph can be configured to use various database backends for data persistence.

### Time-Series Database (TimescaleDB)

For historical transaction data and time-based queries:

1. Set up TimescaleDB (PostgreSQL extension):

```bash
# Using Docker
docker run -d --name timescaledb -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_password \
  timescale/timescaledb:latest-pg14
```

2. Configure database connection in your environment:

```
DB_TIMESCALE_HOST=localhost
DB_TIMESCALE_PORT=5432
DB_TIMESCALE_USER=postgres
DB_TIMESCALE_PASSWORD=your_password
DB_TIMESCALE_DATABASE=solana_flowgraph
```

### Graph Database (Neo4j)

For relationship queries and graph data:

1. Set up Neo4j:

```bash
# Using Docker
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:latest
```

2. Configure Neo4j connection:

```
DB_NEO4J_URI=bolt://localhost:7687
DB_NEO4J_USER=neo4j
DB_NEO4J_PASSWORD=your_password
```

### Redis Cache

For high-performance caching:

1. Set up Redis:

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:latest
```

2. Configure Redis connection:

```
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

## Deployment Options

Solana FlowGraph can be deployed using various methods depending on your requirements.

### Vercel Deployment

For the simplest deployment experience, Vercel is recommended:

1. Push your code to a GitHub, GitLab, or Bitbucket repository
2. Import the project in Vercel dashboard
3. Configure environment variables
4. Deploy

**OR** use the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Docker Deployment

For containerized deployment:

1. Build the Docker image:

```bash
docker build -t solana-flowgraph .
```

2. Run the container:

```bash
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your_key \
  -e NEXT_PUBLIC_NETWORK=mainnet \
  solana-flowgraph
```

For a complete setup with databases, use Docker Compose:

```bash
docker-compose up -d
```

### Traditional Hosting

For deployment on traditional hosting platforms:

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

The build output will be in the `.next` directory, which can be deployed to any hosting service that supports Node.js.

## Post-Deployment Steps

After deployment, perform these steps to ensure proper operation:

### 1. Verify API Connectivity

- Navigate to your deployed application
- Check the console for any API connection errors
- Verify that data is being retrieved from the configured data sources

### 2. Configure Monitoring

- Set up monitoring for application health
- Configure alerts for API failures or performance issues
- Implement logging for tracking usage and errors

### 3. Perform Security Checks

- Ensure API keys are properly secured
- Verify that sensitive environment variables are protected
- Check for any exposed endpoints or security vulnerabilities

## Monitoring and Maintenance

### Health Monitoring

Monitor the health of your deployment using:

- Application logs for error tracking
- API endpoint status checks
- Database connection monitoring
- Resource utilization metrics (CPU, memory, network)

### Data Synchronization

Ensure proper data synchronization:

- Check for missing data ranges
- Verify backfill processes are working properly
- Monitor data consistency across different sources

### Updates and Maintenance

Regular maintenance procedures:

- Update dependencies regularly for security patches
- Monitor API usage and rate limits
- Schedule regular database maintenance
- Plan for version upgrades

## Troubleshooting

### Common Issues

#### API Connection Failures

**Symptoms**: "Failed to load data" errors, empty visualizations

**Solutions**:
- Verify API keys are correct in environment configuration
- Check network connectivity to API endpoints
- Review rate limits and adjust request frequency if necessary

#### Performance Issues

**Symptoms**: Slow loading times, unresponsive visualizations

**Solutions**:
- Increase cache utilization
- Optimize graph rendering parameters
- Reduce maximum node count for complex visualizations
- Scale up server resources if needed

#### Database Connectivity

**Symptoms**: "Failed to store data" errors, missing historical information

**Solutions**:
- Check database connection parameters
- Verify database service is running
- Ensure proper authentication credentials
- Check disk space availability for database storage

#### Visualization Rendering Issues

**Symptoms**: Blank or incomplete visualizations, browser console errors

**Solutions**:
- Update to latest browser version
- Clear browser cache and reload
- Check for JavaScript errors in browser console
- Adjust visualization parameters for better performance 
