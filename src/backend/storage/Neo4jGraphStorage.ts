import { GraphStorage, GraphQuery, Node, Edge, NodeType } from './types';
import neo4j, { Driver, Integer, Node as Neo4jNode, Relationship as Neo4jRelationship, QueryResult } from 'neo4j-driver';

/**
 * Neo4j edge relationship types
 */
export enum RelationshipType {
  SENDS = 'SENDS',
  RECEIVES = 'RECEIVES',
  INTERACTS = 'INTERACTS',
  CALLS = 'CALLS',
  OWNS = 'OWNS'
}

/**
 * Configuration for Neo4j connection
 */
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
   * Create a node in the graph
   */
  async createNode(node: Node): Promise<Node> {
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
        case NodeType.TRANSACTION:
          nodeLabel = 'Transaction';
          break;
        case NodeType.VALIDATOR:
          nodeLabel = 'Validator';
          break;
        case NodeType.NFT:
          nodeLabel = 'NFT';
          break;
        default:
          nodeLabel = 'Node';
      }
      
      // Neo4j doesn't handle Date objects directly, convert to strings
      const properties = {
        ...node.properties,
        id: node.id,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString()
      };
      
      // Create or merge node
      await session.run(
        `MERGE (n:${nodeLabel} {id: $id})
         SET n += $properties
         RETURN n`,
        { id: node.id, properties } 
      );
      
      return node;
    } catch (error) {
      console.error(`Failed to add node ${node.id} to Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<Node | null> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const result = await session.run(
        `MATCH (n {id: $id})
         RETURN n`,
        { id } 
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      const neo4jNode = record.get('n');
      
      // Extract node type from labels
      let type = NodeType.PROGRAM; // Default
      if (neo4jNode.labels.includes('Wallet')) type = NodeType.WALLET;
      else if (neo4jNode.labels.includes('Program')) type = NodeType.PROGRAM;
      else if (neo4jNode.labels.includes('Token')) type = NodeType.TOKEN;
      else if (neo4jNode.labels.includes('Transaction')) type = NodeType.TRANSACTION;
      else if (neo4jNode.labels.includes('Validator')) type = NodeType.VALIDATOR;
      else if (neo4jNode.labels.includes('NFT')) type = NodeType.NFT;
      
      // Extract properties (removing timestamps that we'll handle separately)
      const { id: nodeId, createdAt, updatedAt, ...rest } = neo4jNode.properties;
      
      // Create Node object
      const node: Node = {
        id: nodeId,
        type,
        properties: rest,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt)
      };
      
      return node;
    } catch (error) {
      console.error(`Failed to get node ${id} from Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Update a node's properties
   */
  async updateNode(id: string, properties: Record<string, any>): Promise<Node> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const updatedAt = new Date().toISOString();
      
      // Update the node
      const result = await session.run(
        `MATCH (n {id: $id})
         SET n += $properties, n.updatedAt = $updatedAt
         RETURN n`,
        { id, properties, updatedAt }
      );
      
      if (result.records.length === 0) {
        throw new Error(`Node with ID ${id} not found`);
      }
      
      const record = result.records[0];
      const neo4jNode = record.get('n');
      
      // Extract node type from labels
      let type = NodeType.PROGRAM; // Default
      if (neo4jNode.labels.includes('Wallet')) type = NodeType.WALLET;
      else if (neo4jNode.labels.includes('Program')) type = NodeType.PROGRAM;
      else if (neo4jNode.labels.includes('Token')) type = NodeType.TOKEN;
      else if (neo4jNode.labels.includes('Transaction')) type = NodeType.TRANSACTION;
      else if (neo4jNode.labels.includes('Validator')) type = NodeType.VALIDATOR;
      else if (neo4jNode.labels.includes('NFT')) type = NodeType.NFT;
      
      // Extract properties (removing timestamps that we'll handle separately)
      const { id: nodeId, createdAt, updatedAt: updatedAtStr, ...rest } = neo4jNode.properties;
      
      // Create Node object
      const node: Node = {
        id: nodeId,
        type,
        properties: rest,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAtStr)
      };
      
      return node;
    } catch (error) {
      console.error(`Failed to update node ${id} in Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(id: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      // Delete the node
      await session.run(
        `MATCH (n {id: $id})
         DETACH DELETE n`,
        { id }
      );
    } catch (error) {
      console.error(`Failed to delete node ${id} from Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create an edge between nodes
   */
  async createEdge(edge: Edge): Promise<Edge> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const { sourceId, targetId, type, properties } = edge;
      
      // Convert timestamps to strings for Neo4j
      const edgeProperties = {
        ...properties,
        id: edge.id,
        createdAt: edge.createdAt.toISOString(),
        updatedAt: edge.updatedAt.toISOString()
      };
      
      // Create relationship between nodes
      await session.run(
        `MATCH (source {id: $sourceId})
         MATCH (target {id: $targetId})
         MERGE (source)-[r:${type}]->(target)
         SET r = $properties
         RETURN r`,
        { 
          sourceId, 
          targetId, 
          properties: edgeProperties
        }
      );
      
      return edge;
    } catch (error) {
      console.error(`Failed to add edge ${edge.id} to Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get an edge by ID
   */
  async getEdge(id: string): Promise<Edge | null> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const result = await session.run(
        `MATCH ()-[r {id: $id}]->()
         RETURN r, startNode(r) as source, endNode(r) as target`,
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      const relationship = record.get('r');
      const sourceNode = record.get('source');
      const targetNode = record.get('target');
      
      // Extract properties
      const { id: edgeId, createdAt, updatedAt, ...restProps } = relationship.properties;
      
      // Create Edge object
      const edge: Edge = {
        id: edgeId,
        sourceId: sourceNode.properties.id,
        targetId: targetNode.properties.id,
        type: relationship.type,
        properties: restProps,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt)
      };
      
      return edge;
    } catch (error) {
      console.error(`Failed to get edge ${id} from Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Update an edge's properties
   */
  async updateEdge(id: string, properties: Record<string, any>): Promise<Edge> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const updatedAt = new Date().toISOString();
      
      // Update the edge
      const result = await session.run(
        `MATCH ()-[r {id: $id}]->()
         SET r += $properties, r.updatedAt = $updatedAt
         RETURN r, startNode(r) as source, endNode(r) as target`,
        { id, properties, updatedAt }
      );
      
      if (result.records.length === 0) {
        throw new Error(`Edge with ID ${id} not found`);
      }
      
      const record = result.records[0];
      const relationship = record.get('r');
      const sourceNode = record.get('source');
      const targetNode = record.get('target');
      
      // Extract properties
      const { id: edgeId, createdAt, updatedAt: updatedAtStr, ...restProps } = relationship.properties;
      
      // Create Edge object
      const edge: Edge = {
        id: edgeId,
        sourceId: sourceNode.properties.id,
        targetId: targetNode.properties.id,
        type: relationship.type,
        properties: restProps,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAtStr)
      };
      
      return edge;
    } catch (error) {
      console.error(`Failed to update edge ${id} in Neo4j:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(id: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      // Delete the edge
      await session.run(
        `MATCH ()-[r {id: $id}]->()
         DELETE r`,
        { id }
      );
    } catch (error) {
      console.error(`Failed to delete edge ${id} from Neo4j:`, error);
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
      
      // Process results - collect all nodes and relationships
      const nodeMap = new Map<string, Node>();
      const edgeMap = new Map<string, Edge>();
      
      for (const record of queryResult.records) {
        // Extract all nodes from the record
        for (const key of record.keys) {
          const value = record.get(key);
          
          // If it's a node
          if (value && neo4j.isNode(value)) {
            this.processNeo4jNode(value as Neo4jNode, nodeMap);
          }
          // If it's a relationship
          else if (value && neo4j.isRelationship(value)) {
            this.processNeo4jRelationship(value as Neo4jRelationship, edgeMap, queryResult);
          }
        }
      }
      
      result.nodes = Array.from(nodeMap.values());
      result.edges = Array.from(edgeMap.values());
      
    } catch (error) {
      console.error('Failed to query Neo4j:', error);
      throw error;
    } finally {
      await session.close();
    }
    
    return result;
  }

  /**
   * Process a Neo4j node into our Node type
   */
  private processNeo4jNode(neo4jNode: Neo4jNode, nodeMap: Map<string, Node>): void {
    // Skip if no ID or already processed
    if (!neo4jNode.properties.id || nodeMap.has(neo4jNode.properties.id)) {
      return;
    }
    
    // Extract node type from labels
    let type = NodeType.PROGRAM; // Default
    if (neo4jNode.labels.includes('Wallet')) type = NodeType.WALLET;
    else if (neo4jNode.labels.includes('Program')) type = NodeType.PROGRAM;
    else if (neo4jNode.labels.includes('Token')) type = NodeType.TOKEN;
    else if (neo4jNode.labels.includes('Transaction')) type = NodeType.TRANSACTION;
    else if (neo4jNode.labels.includes('Validator')) type = NodeType.VALIDATOR;
    else if (neo4jNode.labels.includes('NFT')) type = NodeType.NFT;
    
    // Extract properties (removing id and timestamps that we handle separately)
    const { id, createdAt, updatedAt, ...rest } = neo4jNode.properties;
    
    // Create Node object with default timestamps if missing
    const node: Node = {
      id,
      type,
      properties: rest,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date()
    };
    
    nodeMap.set(id, node);
  }

  /**
   * Process a Neo4j relationship into our Edge type
   */
  private processNeo4jRelationship(
    relationship: Neo4jRelationship, 
    edgeMap: Map<string, Edge>,
    queryResult: QueryResult<Record<string, any>>
  ): void {
    // Generate ID if not present
    const id = relationship.properties.id || 
      `${relationship.startNodeElementId}-${relationship.type}-${relationship.endNodeElementId}`;
    
    // Skip if already processed
    if (edgeMap.has(id)) {
      return;
    }
    
    // Find source and target IDs - this is complex because we need to find the node objects
    let sourceId = '';
    let targetId = '';
    
    // Try to find source and target nodes from the records
    for (const record of queryResult.records) {
      for (const key of record.keys) {
        const value = record.get(key);
        if (value && neo4j.isNode(value)) {
          // Check if this node is the source or target of our relationship
          if (value.identity.equals(relationship.startNodeElementId)) {
            sourceId = value.properties.id;
          } else if (value.identity.equals(relationship.endNodeElementId)) {
            targetId = value.properties.id;
          }
        }
      }
    }
    
    // Skip if we couldn't find source and target IDs
    if (!sourceId || !targetId) {
      return;
    }
    
    // Extract properties (removing ID and timestamps we handle separately)
    const { id: edgeId, createdAt, updatedAt, ...rest } = relationship.properties;
    
    // Create Edge object with default timestamps if missing
    const edge: Edge = {
      id: edgeId || id,
      sourceId,
      targetId,
      type: relationship.type,
      properties: rest,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date()
    };
    
    edgeMap.set(edge.id, edge);
  }

  /**
   * Find a path between two nodes
   */
  async findPathBetweenNodes(sourceId: string, targetId: string, maxDepth: number = 3): Promise<{ nodes: Node[], edges: Edge[] }> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({ database: this.database });
    
    try {
      // Build path query
      const cypher = `
        MATCH path = (source {id: $sourceId})-[*..${maxDepth}]->(target {id: $targetId})
        RETURN path
        LIMIT 1
      `;
      
      // Execute the query
      const queryResult = await session.run(cypher, { sourceId, targetId });
      
      // Process results - if path is found, it will include nodes and relationships
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      
      if (queryResult.records.length > 0) {
        const path = queryResult.records[0].get('path');
        
        // Extract nodes and relationships from path
        const nodeMap = new Map<string, Node>();
        const edgeMap = new Map<string, Edge>();
        
        // Process path segments
        for (const segment of path.segments) {
          // Process start node
          this.processNeo4jNode(segment.start as Neo4jNode, nodeMap);
          
          // Process end node
          this.processNeo4jNode(segment.end as Neo4jNode, nodeMap);
          
          // Process relationship
          this.processNeo4jRelationship(segment.relationship as Neo4jRelationship, edgeMap, queryResult);
        }
        
        // Convert maps to arrays
        nodes.push(...nodeMap.values());
        edges.push(...edgeMap.values());
      }
      
      return { nodes, edges };
    } catch (error) {
      console.error('Failed to find path in Neo4j:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Build a Cypher query from a GraphQuery object
   */
  private buildCypherQuery(query: GraphQuery): { cypher: string, params: any } {
    const params: any = {};
    let cypher = '';
    
    // Start with a simple node-based query
    if (query.startNodeId) {
      cypher = `
        MATCH (n {id: $startNodeId})
        OPTIONAL MATCH (n)-[r]-(m)
        WHERE r.type = $edgeType OR $edgeType IS NULL
        RETURN n, r, m
        LIMIT ${query.limit || 100}
      `;
      params.startNodeId = query.startNodeId;
      params.edgeType = query.edgeType;
    } 
    // Default query - recent transactions
    else {
      cypher = `
        MATCH (n:Transaction)
        WHERE n.timestamp >= $fromTime
        OPTIONAL MATCH (source)-[r]->(target)
        WHERE (source.id = n.id OR target.id = n.id)
        RETURN n, source, r, target
        ORDER BY n.timestamp DESC
        LIMIT ${query.limit || 100}
      `;
      params.fromTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }
    
    return { cypher, params };
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

  private async extractNodes(result: QueryResult<Record<string, any>>): Promise<Node[]> {
    const records = result.records;
    const nodeMap = new Map<string, Node>();
    
    for (const record of records) {
      // Extract all nodes from the record
      for (const key of record.keys) {
        const value = record.get(key);
        
        // If it's a node
        if (value && neo4j.isNode(value)) {
          // Cast to Neo4jNode
          this.processNeo4jNode(value as Neo4jNode, nodeMap);
        }
      }
    }
    
    return Array.from(nodeMap.values());
  }

  private async extractEdges(result: QueryResult<Record<string, any>>): Promise<Edge[]> {
    const records = result.records;
    const edgeMap = new Map<string, Edge>();
    
    for (const record of records) {
      // Extract all relationships from the record
      for (const key of record.keys) {
        const value = record.get(key);
        
        // If it's a relationship
        if (value && neo4j.isRelationship(value)) {
          // Cast to Neo4jRelationship
          this.processNeo4jRelationship(value as Neo4jRelationship, edgeMap, result);
        }
      }
    }
    
    return Array.from(edgeMap.values());
  }
} 