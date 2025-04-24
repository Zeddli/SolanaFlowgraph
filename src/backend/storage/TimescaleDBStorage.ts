import { Pool, PoolClient } from 'pg';
import { TimeSeriesStorage, TimeSeriesQuery, TimeSeriesEntry, TimeSeriesMetadata } from './types';

// Define MetricType since it's missing from types.ts
export enum MetricType {
  GAUGE = 'gauge',
  COUNTER = 'counter',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface TimescaleDBConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
}

/**
 * TimescaleDB implementation of TimeSeriesStorage
 * Provides high-performance time-series storage for blockchain metrics
 */
export class TimescaleDBStorage implements TimeSeriesStorage {
  private pool: Pool;
  private connected: boolean = false;
  private readonly tables: Map<string, boolean> = new Map();

  constructor(config: TimescaleDBConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: config.poolSize || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: this.isProductionEnv() ? 10000 : 20000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected TimescaleDB pool error:', err);
    });
  }

  private isProductionEnv(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize connection and create tables/hypertables
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.pool.query('SELECT NOW()');
      this.connected = true;
      console.log('Connected to TimescaleDB');

      // Create schema and tables
      await this.createSchema();
    } catch (error) {
      console.error('Failed to connect to TimescaleDB:', error);
      throw error;
    }
  }

  /**
   * Create schema, tables, and hypertables
   */
  private async createSchema(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Create transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          time TIMESTAMPTZ NOT NULL,
          signature TEXT NOT NULL,
          slot BIGINT NOT NULL,
          block_hash TEXT,
          fee BIGINT,
          program_id TEXT,
          status TEXT,
          error TEXT,
          source_wallet TEXT,
          target_wallet TEXT,
          amount NUMERIC,
          token_id TEXT,
          PRIMARY KEY (time, signature)
        )
      `);
      
      // Convert to TimescaleDB hypertable
      await client.query(`
        SELECT create_hypertable('transactions', 'time', if_not_exists => TRUE)
      `);
      
      // Create metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          time TIMESTAMPTZ NOT NULL,
          metric_name TEXT NOT NULL,
          metric_type TEXT NOT NULL,
          value DOUBLE PRECISION NOT NULL,
          dimensions JSONB,
          PRIMARY KEY (time, metric_name)
        )
      `);
      
      // Convert metrics to hypertable
      await client.query(`
        SELECT create_hypertable('metrics', 'time', if_not_exists => TRUE)
      `);
      
      // Create specific indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions (signature);
        CREATE INDEX IF NOT EXISTS idx_transactions_program_id ON transactions (program_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_wallets ON transactions (source_wallet, target_wallet);
        CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics (metric_name);
        CREATE INDEX IF NOT EXISTS idx_metrics_dimensions ON metrics USING GIN (dimensions);
      `);
      
      console.log('TimescaleDB schema created successfully');
      this.tables.set('transactions', true);
      this.tables.set('metrics', true);
      
    } catch (error) {
      console.error('Failed to create TimescaleDB schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert a single time series entry
   * Implementation of TimeSeriesStorage.insert
   */
  async insert(measurement: string, entry: TimeSeriesEntry): Promise<void> {
    return this.insertBatch(measurement, [entry]);
  }

  /**
   * Insert multiple time series entries in batch
   * Implementation of TimeSeriesStorage.insertBatch
   */
  async insertBatch(measurement: string, entries: TimeSeriesEntry[]): Promise<void> {
    return this.store(measurement, entries);
  }

  /**
   * Get metadata for a measurement
   * Implementation of TimeSeriesStorage.getMetadata
   */
  async getMetadata(measurement: string): Promise<TimeSeriesMetadata> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }

    // Select the appropriate table based on measurement
    let tableName: string;
    switch (measurement) {
      case 'transaction':
        tableName = 'transactions';
        break;
      case 'metric':
        tableName = 'metrics';
        break;
      default:
        tableName = 'metrics';
    }

    // Ensure table exists
    if (!this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Query for metadata
    let fieldsQuery: string;
    if (tableName === 'transactions') {
      fieldsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'transactions'
      `;
    } else {
      fieldsQuery = `
        SELECT DISTINCT metric_name 
        FROM metrics
      `;
    }

    const fields = await this.pool.query(fieldsQuery);
    
    // Get count
    const countQuery = `SELECT COUNT(*) FROM ${tableName}`;
    const countResult = await this.pool.query(countQuery);
    
    // Get time range
    const timeRangeQuery = `
      SELECT 
        MIN(time) as earliest,
        MAX(time) as latest
      FROM ${tableName}
    `;
    const timeResult = await this.pool.query(timeRangeQuery);

    // Create metadata object
    const metadata: TimeSeriesMetadata = {
      measurement,
      fields: fields.rows.map(row => row.column_name || row.metric_name),
      tags: [],
      totalRecords: parseInt(countResult.rows[0].count)
    };

    if (timeResult.rows[0].earliest) {
      metadata.earliestRecord = timeResult.rows[0].earliest;
    }
    if (timeResult.rows[0].latest) {
      metadata.latestRecord = timeResult.rows[0].latest;
    }

    return metadata;
  }

  /**
   * Drop a measurement
   * Implementation of TimeSeriesStorage.dropMeasurement
   */
  async dropMeasurement(measurement: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }

    // Select the appropriate table based on measurement
    let tableName: string;
    switch (measurement) {
      case 'transaction':
        tableName = 'transactions';
        break;
      case 'metric':
        tableName = 'metrics';
        break;
      default:
        throw new Error(`Unknown measurement: ${measurement}`);
    }

    // Drop the table
    await this.pool.query(`DROP TABLE IF EXISTS ${tableName}`);
    this.tables.delete(tableName);
  }

  /**
   * Store a time series entry
   */
  async store(measurement: string, entries: TimeSeriesEntry[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    // Ensure we have entries to store
    if (entries.length === 0) return;
    
    // Select the appropriate table based on measurement
    let tableName: string;
    switch (measurement) {
      case 'transaction':
        tableName = 'transactions';
        break;
      case 'metric':
        tableName = 'metrics';
        break;
      default:
        tableName = 'metrics'; // Default to metrics table
    }
    
    // Ensure table exists
    if (!this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    const client = await this.pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      if (tableName === 'transactions') {
        await this.storeTransactions(client, entries);
      } else {
        await this.storeMetrics(client, entries);
      }
      
      // Commit transaction
      await client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error(`Failed to store time series data in ${tableName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Store transaction entries
   */
  private async storeTransactions(client: PoolClient, entries: TimeSeriesEntry[]): Promise<void> {
    // Prepare values for batch insert
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    entries.forEach(entry => {
      const { timestamp, data } = entry;
      
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      
      params.push(
        timestamp,
        data.signature || '',
        data.slot || 0,
        data.block_hash || null,
        data.fee || 0,
        data.program_id || null,
        data.status || 'unknown',
        data.error || null,
        data.source_wallet || null,
        data.target_wallet || null,
        data.amount || null,
        data.token_id || null
      );
    });
    
    // Execute batch insert
    const query = `
      INSERT INTO transactions (
        time, signature, slot, block_hash, fee, program_id, status, error, 
        source_wallet, target_wallet, amount, token_id
      )
      VALUES ${values.join(', ')}
      ON CONFLICT (time, signature) DO UPDATE SET
        slot = EXCLUDED.slot,
        block_hash = EXCLUDED.block_hash,
        fee = EXCLUDED.fee,
        program_id = EXCLUDED.program_id,
        status = EXCLUDED.status,
        error = EXCLUDED.error,
        source_wallet = EXCLUDED.source_wallet,
        target_wallet = EXCLUDED.target_wallet,
        amount = EXCLUDED.amount,
        token_id = EXCLUDED.token_id
    `;
    
    await client.query(query, params);
  }
  
  /**
   * Store metric entries
   */
  private async storeMetrics(client: PoolClient, entries: TimeSeriesEntry[]): Promise<void> {
    // Prepare values for batch insert
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    entries.forEach(entry => {
      const { timestamp, data, tags } = entry;
      
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      
      params.push(
        timestamp,
        data.metricName || 'unknown',
        data.metricType || MetricType.GAUGE,
        data.value || 0,
        tags ? JSON.stringify(tags) : '{}'
      );
    });
    
    // Execute batch insert
    const query = `
      INSERT INTO metrics (time, metric_name, metric_type, value, dimensions)
      VALUES ${values.join(', ')}
      ON CONFLICT (time, metric_name) DO UPDATE SET
        metric_type = EXCLUDED.metric_type,
        value = EXCLUDED.value,
        dimensions = EXCLUDED.dimensions
    `;
    
    await client.query(query, params);
  }

  /**
   * Query time series data
   */
  async query(measurement: string, query: TimeSeriesQuery): Promise<TimeSeriesEntry[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    // Select the appropriate table based on measurement
    let tableName: string;
    let queryFn: Function;
    
    switch (measurement) {
      case 'transaction':
        tableName = 'transactions';
        queryFn = this.queryTransactions.bind(this);
        break;
      case 'metric':
        tableName = 'metrics';
        queryFn = this.queryMetrics.bind(this);
        break;
      default:
        tableName = 'metrics'; // Default to metrics table
        queryFn = this.queryMetrics.bind(this);
    }
    
    // Ensure table exists
    if (!this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} does not exist`);
    }
    
    return queryFn(query);
  }
  
  /**
   * Query transactions table
   */
  private async queryTransactions(query: TimeSeriesQuery): Promise<TimeSeriesEntry[]> {
    const { startTime, endTime, tags, aggregation, limit } = query;
    
    // Build the SQL query
    let sql = `SELECT * FROM transactions WHERE time >= $1 AND time <= $2`;
    const params: any[] = [
      startTime || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime || new Date()
    ];
    
    let paramIndex = 3;
    
    // Add filters from tags
    if (tags) {
      if (tags.signature) {
        sql += ` AND signature = $${paramIndex++}`;
        params.push(tags.signature);
      }
      
      if (tags.program_id) {
        sql += ` AND program_id = $${paramIndex++}`;
        params.push(tags.program_id);
      }
      
      if (tags.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(tags.status);
      }
      
      if (tags.wallet) {
        sql += ` AND (source_wallet = $${paramIndex} OR target_wallet = $${paramIndex})`;
        params.push(tags.wallet);
        paramIndex++;
      }
    }
    
    // Add order by and limit
    sql += ` ORDER BY time DESC LIMIT $${paramIndex}`;
    params.push(limit || 100);
    
    // Execute query
    const result = await this.pool.query(sql, params);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => ({
      timestamp: row.time,
      data: {
        signature: row.signature,
        slot: row.slot,
        block_hash: row.block_hash,
        fee: row.fee,
        program_id: row.program_id,
        status: row.status,
        error: row.error,
        source_wallet: row.source_wallet,
        target_wallet: row.target_wallet,
        amount: row.amount,
        token_id: row.token_id
      },
      tags: {
        signature: row.signature,
        program_id: row.program_id,
        status: row.status
      }
    }));
  }
  
  /**
   * Query metrics table
   */
  private async queryMetrics(query: TimeSeriesQuery): Promise<TimeSeriesEntry[]> {
    const { startTime, endTime, tags, aggregation, groupBy, limit } = query;
    const metricNames = tags?.metricNames as string[] | undefined;
    const interval = tags?.interval as string | undefined;
    
    // Check if we should do time-based aggregation
    const useAggregation = aggregation && interval;
    
    // Build the SQL query
    let sql: string;
    const params: any[] = [
      startTime || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endTime || new Date()
    ];
    
    let paramIndex = 3;
    
    if (useAggregation) {
      // Aggregation query
      sql = `
        SELECT
          time_bucket($${paramIndex++}, time) AS bucket,
          metric_name,
          metric_type,
      `;
      
      params.push(interval); // e.g., '1 hour', '5 minutes'
      
      // Add aggregation function
      switch (aggregation) {
        case 'avg':
          sql += 'AVG(value) AS value';
          break;
        case 'sum':
          sql += 'SUM(value) AS value';
          break;
        case 'min':
          sql += 'MIN(value) AS value';
          break;
        case 'max':
          sql += 'MAX(value) AS value';
          break;
        case 'count':
          sql += 'COUNT(*) AS value';
          break;
        default:
          sql += 'AVG(value) AS value';
      }
      
      sql += `, dimensions FROM metrics WHERE time >= $1 AND time <= $2`;
    } else {
      // Regular query without aggregation
      sql = `SELECT * FROM metrics WHERE time >= $1 AND time <= $2`;
    }
    
    // Add metric name filter
    if (metricNames && metricNames.length > 0) {
      sql += ` AND metric_name IN (`;
      for (let i = 0; i < metricNames.length; i++) {
        sql += i === 0 ? `$${paramIndex++}` : `, $${paramIndex++}`;
        params.push(metricNames[i]);
      }
      sql += `)`;
    }
    
    // Add dimension filters
    if (tags && Object.keys(tags).length > 0) {
      for (const [key, value] of Object.entries(tags)) {
        if (key !== 'metricNames' && key !== 'interval') {
          sql += ` AND dimensions->>'${key}' = $${paramIndex++}`;
          params.push(value);
        }
      }
    }
    
    // Add group by clause for aggregation
    if (useAggregation) {
      sql += ` GROUP BY bucket, metric_name, metric_type, dimensions ORDER BY bucket DESC`;
    } else {
      sql += ` ORDER BY time DESC`;
    }
    
    // Add limit
    sql += ` LIMIT $${paramIndex}`;
    params.push(limit || 100);
    
    // Execute query
    const result = await this.pool.query(sql, params);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => {
      const timestamp = useAggregation ? row.bucket : row.time;
      
      return {
        timestamp,
        data: {
          metricName: row.metric_name,
          metricType: row.metric_type,
          value: row.value
        },
        tags: row.dimensions
      };
    });
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
    }
  }

  /**
   * Get liquidity flows within a specific time range with optional token filtering
   * Used for analyzing token movements over time
   */
  async getLiquidityFlows(params: {
    startTime: Date;
    endTime: Date;
    tokenAddress?: string;
    minAmount?: number;
    groupByHours?: number;
    walletAddress?: string;
  }): Promise<TimeSeriesEntry[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { 
      startTime, 
      endTime, 
      tokenAddress, 
      minAmount, 
      groupByHours = 1,
      walletAddress
    } = params;
    
    // Build the time bucket interval
    const interval = `${groupByHours} hour`;
    
    let sql = `
      SELECT 
        time_bucket($1, time) AS period,
        token_id,
        SUM(amount) AS volume,
        COUNT(*) AS tx_count
      FROM transactions
      WHERE time >= $2 AND time <= $3
    `;
    
    const queryParams: any[] = [interval, startTime, endTime];
    let paramIndex = 4;
    
    if (tokenAddress) {
      sql += ` AND token_id = $${paramIndex++}`;
      queryParams.push(tokenAddress);
    }
    
    if (minAmount) {
      sql += ` AND amount >= $${paramIndex++}`;
      queryParams.push(minAmount);
    }
    
    if (walletAddress) {
      sql += ` AND (source_wallet = $${paramIndex} OR target_wallet = $${paramIndex})`;
      queryParams.push(walletAddress);
      paramIndex++;
    }
    
    sql += `
      GROUP BY period, token_id
      ORDER BY period DESC
    `;
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => ({
      timestamp: row.period,
      data: {
        token: row.token_id,
        volume: parseFloat(row.volume),
        txCount: parseInt(row.tx_count)
      },
      tags: {
        token: row.token_id
      }
    }));
  }
  
  /**
   * Get the top wallets by transaction volume
   */
  async getTopWallets(params: {
    startTime: Date;
    endTime: Date;
    limit?: number;
    direction?: 'in' | 'out' | 'both';
  }): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { startTime, endTime, limit = 20, direction = 'both' } = params;
    
    let sql: string;
    const queryParams: any[] = [startTime, endTime];
    
    if (direction === 'in') {
      // Receiving wallets
      sql = `
        SELECT 
          target_wallet AS wallet_address,
          SUM(amount) AS total_volume,
          COUNT(*) AS tx_count
        FROM transactions
        WHERE time >= $1 AND time <= $2
          AND target_wallet IS NOT NULL
        GROUP BY target_wallet
        ORDER BY total_volume DESC
        LIMIT $3
      `;
    } else if (direction === 'out') {
      // Sending wallets
      sql = `
        SELECT 
          source_wallet AS wallet_address,
          SUM(amount) AS total_volume,
          COUNT(*) AS tx_count
        FROM transactions
        WHERE time >= $1 AND time <= $2
          AND source_wallet IS NOT NULL
        GROUP BY source_wallet
        ORDER BY total_volume DESC
        LIMIT $3
      `;
    } else {
      // Both directions combined
      sql = `
        SELECT 
          wallet_address,
          SUM(total_volume) AS total_volume,
          SUM(tx_count) AS tx_count
        FROM (
          SELECT 
            source_wallet AS wallet_address,
            SUM(amount) AS total_volume,
            COUNT(*) AS tx_count
          FROM transactions
          WHERE time >= $1 AND time <= $2
            AND source_wallet IS NOT NULL
          GROUP BY source_wallet
          
          UNION ALL
          
          SELECT 
            target_wallet AS wallet_address,
            SUM(amount) AS total_volume,
            COUNT(*) AS tx_count
          FROM transactions
          WHERE time >= $1 AND time <= $2
            AND target_wallet IS NOT NULL
          GROUP BY target_wallet
        ) combined
        GROUP BY wallet_address
        ORDER BY total_volume DESC
        LIMIT $3
      `;
    }
    
    queryParams.push(limit);
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    return result.rows.map(row => ({
      address: row.wallet_address,
      volume: parseFloat(row.total_volume),
      txCount: parseInt(row.tx_count)
    }));
  }
  
  /**
   * Get program usage statistics
   */
  async getProgramActivity(params: {
    startTime: Date;
    endTime: Date;
    programId?: string;
    interval?: string;
  }): Promise<TimeSeriesEntry[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { startTime, endTime, programId, interval = '1 hour' } = params;
    
    let sql = `
      SELECT 
        time_bucket($1, time) AS period,
        program_id,
        COUNT(*) AS tx_count,
        COUNT(DISTINCT source_wallet) AS unique_users
      FROM transactions
      WHERE time >= $2 AND time <= $3
    `;
    
    const queryParams: any[] = [interval, startTime, endTime];
    let paramIndex = 4;
    
    if (programId) {
      sql += ` AND program_id = $${paramIndex++}`;
      queryParams.push(programId);
    } else {
      sql += ` AND program_id IS NOT NULL`;
    }
    
    sql += `
      GROUP BY period, program_id
      ORDER BY period DESC, tx_count DESC
    `;
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => ({
      timestamp: row.period,
      data: {
        programId: row.program_id,
        txCount: parseInt(row.tx_count),
        uniqueUsers: parseInt(row.unique_users)
      },
      tags: {
        programId: row.program_id
      }
    }));
  }
  
  /**
   * Detect large or unusual transactions
   */
  async getUnusualTransactions(params: {
    startTime: Date;
    endTime: Date;
    deviationThreshold?: number;
    minAmount?: number;
    limit?: number;
  }): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { 
      startTime, 
      endTime, 
      deviationThreshold = 2.0, // Standard deviations from mean
      minAmount = 0,
      limit = 20
    } = params;
    
    // This query finds transactions that are significantly larger than
    // the average transaction amount for each token
    const sql = `
      WITH token_stats AS (
        SELECT 
          token_id,
          AVG(amount) as avg_amount,
          STDDEV(amount) as stddev_amount
        FROM transactions
        WHERE time >= $1 AND time <= $2
          AND amount > 0
        GROUP BY token_id
      )
      SELECT 
        t.signature,
        t.time,
        t.source_wallet,
        t.target_wallet,
        t.amount,
        t.token_id,
        t.program_id,
        ts.avg_amount,
        ts.stddev_amount,
        (t.amount - ts.avg_amount) / NULLIF(ts.stddev_amount, 0) as deviation
      FROM transactions t
      JOIN token_stats ts ON t.token_id = ts.token_id
      WHERE t.time >= $1 AND t.time <= $2
        AND t.amount >= $3
        AND (t.amount - ts.avg_amount) / NULLIF(ts.stddev_amount, 0) >= $4
      ORDER BY deviation DESC
      LIMIT $5
    `;
    
    const queryParams = [
      startTime,
      endTime,
      minAmount,
      deviationThreshold,
      limit
    ];
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    
    return result.rows.map(row => ({
      signature: row.signature,
      timestamp: row.time,
      sourceWallet: row.source_wallet,
      targetWallet: row.target_wallet,
      amount: parseFloat(row.amount),
      token: row.token_id,
      programId: row.program_id,
      avgAmount: parseFloat(row.avg_amount),
      stdDev: parseFloat(row.stddev_amount),
      deviation: parseFloat(row.deviation)
    }));
  }
  
  /**
   * Get token velocity - how quickly tokens are changing hands
   */
  async getTokenVelocity(params: {
    startTime: Date;
    endTime: Date;
    tokenAddress: string;
    interval?: string;
  }): Promise<TimeSeriesEntry[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { 
      startTime, 
      endTime, 
      tokenAddress,
      interval = '1 day'
    } = params;
    
    const sql = `
      WITH daily_stats AS (
        SELECT 
          time_bucket($1, time) AS period,
          COUNT(DISTINCT source_wallet) + COUNT(DISTINCT target_wallet) AS active_wallets,
          COUNT(*) AS tx_count,
          SUM(amount) AS volume
        FROM transactions
        WHERE time >= $2 AND time <= $3
          AND token_id = $4
        GROUP BY period
      )
      SELECT 
        period,
        active_wallets,
        tx_count,
        volume,
        CASE 
          WHEN active_wallets > 0 THEN tx_count::float / active_wallets 
          ELSE 0 
        END AS tx_per_wallet,
        CASE 
          WHEN active_wallets > 0 THEN volume::float / active_wallets 
          ELSE 0 
        END AS volume_per_wallet
      FROM daily_stats
      ORDER BY period DESC
    `;
    
    const queryParams = [interval, startTime, endTime, tokenAddress];
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => ({
      timestamp: row.period,
      data: {
        activeWallets: parseInt(row.active_wallets),
        txCount: parseInt(row.tx_count),
        volume: parseFloat(row.volume),
        txPerWallet: parseFloat(row.tx_per_wallet),
        volumePerWallet: parseFloat(row.volume_per_wallet)
      },
      tags: {
        token: tokenAddress
      }
    }));
  }
  
  /**
   * Analyze wallet behavior over time
   */
  async getWalletActivity(walletAddress: string, params: {
    startTime: Date;
    endTime: Date;
    interval?: string;
  }): Promise<TimeSeriesEntry[]> {
    if (!this.connected) {
      throw new Error('Not connected to TimescaleDB');
    }
    
    const { startTime, endTime, interval = '1 day' } = params;
    
    const sql = `
      SELECT 
        time_bucket($1, time) AS period,
        COUNT(*) FILTER (WHERE source_wallet = $4) AS outgoing_tx,
        SUM(amount) FILTER (WHERE source_wallet = $4) AS outgoing_volume,
        COUNT(*) FILTER (WHERE target_wallet = $4) AS incoming_tx,
        SUM(amount) FILTER (WHERE target_wallet = $4) AS incoming_volume,
        COUNT(DISTINCT program_id) AS programs_used
      FROM transactions
      WHERE time >= $2 AND time <= $3
        AND (source_wallet = $4 OR target_wallet = $4)
      GROUP BY period
      ORDER BY period DESC
    `;
    
    const queryParams = [interval, startTime, endTime, walletAddress];
    
    // Execute query
    const result = await this.pool.query(sql, queryParams);
    
    // Map database rows to TimeSeriesEntry objects
    return result.rows.map(row => ({
      timestamp: row.period,
      data: {
        outgoingTx: parseInt(row.outgoing_tx) || 0,
        outgoingVolume: parseFloat(row.outgoing_volume) || 0,
        incomingTx: parseInt(row.incoming_tx) || 0,
        incomingVolume: parseFloat(row.incoming_volume) || 0,
        programsUsed: parseInt(row.programs_used) || 0,
        netFlow: (parseFloat(row.incoming_volume) || 0) - (parseFloat(row.outgoing_volume) || 0)
      },
      tags: {
        wallet: walletAddress
      }
    }));
  }
} 