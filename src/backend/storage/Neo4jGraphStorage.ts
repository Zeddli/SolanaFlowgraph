import { GraphStorage, GraphQuery, Node, Edge, Relationship, NodeType } from './types';
import neo4j, { Driver, Session, Result, Record } from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

/**
 * Neo4j implementation of GraphStorage
 * Handles storing and querying transaction data as a graph
 */
export class Neo4jGraphStorage implements GraphStorage {
  private driver: Driver;
  private database: string;
  private connected: boolean = false;

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
    this.database = config.database || 'neo4j';
  }

  /**
   * Initialize connection and schema
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.driver.verifyConnectivity();
      this.connected = true;
      console.log('Connected to Neo4j database');
      
      // Create constraints and indexes for better performance
      await this.createSchema();
      
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  /**
   * Create schema constraints and indexes
   */
  private async createSchema(): Promise<void> {
    const session = this.driver.session({ database: this.database });
    
    try {
      // Create constraints for uniqueness
      await session.run(`
        CREATE CONSTRAINT wallet_address IF NOT EXISTS
        FOR (w:Wallet) REQUIRE w.address IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT program_address IF NOT EXISTS
        FOR (p:Program) REQUIRE p.address IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT transaction_signature IF NOT EXISTS
        FOR (t:Transaction) REQUIRE t.signature IS UNIQUE
      `);
      
      // Create indexes for better query performance
      await session.run(`
        CREATE INDEX transaction_timestamp IF NOT EXISTS
        FOR (t:Transaction) ON (t.timestamp)
      `);
      
      console.log('Neo4j schema created successfully');
    } catch (error) {
      console.error('Failed to create Neo4j schema:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Add a node to the graph
   */
  async addNode(node: Node): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      // Create different labels based on node type
      let nodeLabel: string;
      switch (node.type) {
        case NodeType.WALLET:
          nodeLabel = 'Wallet';
          break;
        case NodeType.PROGRAM:
          nodeLabel = 'Program';
          break;
        case NodeType.TOKEN:
          nodeLabel = 'Token';
          break;
        case NodeType.PROTOCOL:
          nodeLabel = 'Protocol';
          break;
        default:
          nodeLabel = 'Node';
      }
      
      // Convert properties to Neo4j-friendly format
      const properties = { ...node.properties, id: node.id };
      
      // Create or merge node
      await session.run(
        `MERGE (n:${nodeLabel} {id: $id})
         SET n += $properties
         RETURN n`,
        { id: node.id, properties }
      );
      
    } catch (error) {
      console.error(`Failed to add node ${node.id} to Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Add an edge between nodes in the graph
   */
  async addEdge(edge: Edge): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const { source, target, relationship, properties } = edge;
      
      // Map relationship type to Neo4j relationship
      let relType: string;
      switch (relationship) {
        case Relationship.SENDS:
          relType = 'SENDS';
          break;
        case Relationship.RECEIVES:
          relType = 'RECEIVES';
          break;
        case Relationship.INTERACTS:
          relType = 'INTERACTS';
          break;
        case Relationship.CALLS:
          relType = 'CALLS';
          break;
        case Relationship.OWNS:
          relType = 'OWNS';
          break;
        default:
          relType = 'RELATES_TO';
      }
      
      // Create relationship between nodes
      await session.run(
        `MATCH (source {id: $sourceId})
         MATCH (target {id: $targetId})
         MERGE (source)-[r:${relType}]->(target)
         SET r += $properties
         RETURN r`,
        { 
          sourceId: source, 
          targetId: target, 
          properties: { ...properties, id: edge.id } 
        }
      );
      
    } catch (error) {
      console.error(`Failed to add edge ${edge.id} to Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Query the graph database
   */
  async query(query: GraphQuery): Promise<{ nodes: Node[], edges: Edge[] }> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    const result: { nodes: Node[], edges: Edge[] } = { nodes: [], edges: [] };
    
    try {
      // Convert query to Cypher
      const { cypher, params } = this.buildCypherQuery(query);
      
      // Execute the query
      const queryResult = await session.run(cypher, params);
      
      // Process results
      result.nodes = this.extractNodes(queryResult);
      result.edges = this.extractEdges(queryResult);
      
    } catch (error) {
      console.error('Failed to query Neo4j:', error);
      throw error;
    } finally {
      await session.close();
    }
    
    return result;
  }

  /**
   * Build a Cypher query from a GraphQuery object
   */
  private buildCypherQuery(query: GraphQuery): { cypher: string, params: any } {
    const params: any = {};
    let cypher = '';
    
    if (query.path) {
      // Path query between two nodes
      cypher = `
        MATCH path = (source {id: $sourceId})-[*..${query.maxDepth || 3}]->(target {id: $targetId})
        RETURN path
        LIMIT ${query.limit || 100}
      `;
      params.sourceId = query.path.source;
      params.targetId = query.path.target;
    } else if (query.nodeIds && query.nodeIds.length > 0) {
      // Query specific nodes and their relationships
      cypher = `
        MATCH (n) 
        WHERE n.id IN $nodeIds
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN n, r, m
        LIMIT ${query.limit || 100}
      `;
      params.nodeIds = query.nodeIds;
    } else if (query.walletAnalysis) {
      // Wallet activity analysis
      cypher = `
        MATCH (w:Wallet {id: $walletId})
        OPTIONAL MATCH (w)-[r:SENDS|RECEIVES]->(target)
        WITH w, target, COUNT(r) AS count
        RETURN w, target, count
        ORDER BY count DESC
        LIMIT ${query.limit || 20}
      `;
      params.walletId = query.walletAnalysis.walletId;
    } else {
      // Default query - recent transactions
      cypher = `
        MATCH (t:Transaction)
        WHERE t.timestamp >= $fromTime
        OPTIONAL MATCH (source)-[r]->(target)
        WHERE source.transactionId = t.id OR target.transactionId = t.id
        RETURN t, source, r, target
        ORDER BY t.timestamp DESC
        LIMIT ${query.limit || 100}
      `;
      params.fromTime = query.timeRange?.from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }
    
    return { cypher, params };
  }

  /**
   * Extract nodes from Neo4j query result
   */
  private extractNodes(result: Result): Node[] {
    const nodeMap = new Map<string, Node>();
    
    result.records.forEach((record: Record) => {
      record.forEach((value, key) => {
        if (neo4j.isNode(value)) {
          const props = value.properties as any;
          const id = props.id as string;
          
          // Skip if already processed
          if (nodeMap.has(id)) return;
          
          // Determine node type from labels
          let type = NodeType.UNKNOWN;
          if (value.labels.includes('Wallet')) type = NodeType.WALLET;
          else if (value.labels.includes('Program')) type = NodeType.PROGRAM;
          else if (value.labels.includes('Token')) type = NodeType.TOKEN;
          else if (value.labels.includes('Protocol')) type = NodeType.PROTOCOL;
          
          // Create node object
          const node: Node = {
            id,
            type,
            properties: { ...props }
          };
          
          // Remove id from properties as it's already the node ID
          delete node.properties.id;
          
          nodeMap.set(id, node);
        }
      });
    });
    
    return Array.from(nodeMap.values());
  }

  /**
   * Extract edges from Neo4j query result
   */
  private extractEdges(result: Result): Edge[] {
    const edgeMap = new Map<string, Edge>();
    
    result.records.forEach((record: Record) => {
      record.forEach((value, key) => {
        if (neo4j.isRelationship(value)) {
          const props = value.properties as any;
          const id = props.id || `${value.startNodeElementId}-${value.type}-${value.endNodeElementId}`;
          
          // Skip if already processed
          if (edgeMap.has(id)) return;
          
          // Map relationship type
          let relationship: Relationship;
          switch (value.type) {
            case 'SENDS': relationship = Relationship.SENDS; break;
            case 'RECEIVES': relationship = Relationship.RECEIVES; break;
            case 'INTERACTS': relationship = Relationship.INTERACTS; break;
            case 'CALLS': relationship = Relationship.CALLS; break;
            case 'OWNS': relationship = Relationship.OWNS; break;
            default: relationship = Relationship.UNKNOWN;
          }
          
          // Create edge object
          const edge: Edge = {
            id,
            source: value.startNodeElementId.toString(),
            target: value.endNodeElementId.toString(),
            relationship,
            properties: { ...props }
          };
          
          // Remove id from properties
          delete edge.properties.id;
          
          edgeMap.set(id, edge);
        }
      });
    });
    
    return Array.from(edgeMap.values());
  }

  /**
   * Close connection to Neo4j
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.connected = false;
    }
  }
} 