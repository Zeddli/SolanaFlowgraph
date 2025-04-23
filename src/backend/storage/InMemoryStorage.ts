import { 
  TimeSeriesStorage, 
  GraphStorage, 
  HybridStorage,
  TimeSeriesEntry,
  TimeSeriesQuery,
  TimeSeriesMetadata,
  Node,
  Edge,
  GraphQuery
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory implementation of TimeSeriesStorage
 * Used for development and testing purposes
 */
export class InMemoryTimeSeriesStorage implements TimeSeriesStorage {
  private data: Map<string, TimeSeriesEntry[]> = new Map();
  
  async insert(measurement: string, entry: TimeSeriesEntry): Promise<void> {
    if (!this.data.has(measurement)) {
      this.data.set(measurement, []);
    }
    
    this.data.get(measurement)!.push({
      ...entry,
      timestamp: entry.timestamp || new Date()
    });
  }
  
  async insertBatch(measurement: string, entries: TimeSeriesEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.insert(measurement, entry);
    }
  }
  
  async query(measurement: string, query: TimeSeriesQuery): Promise<TimeSeriesEntry[]> {
    if (!this.data.has(measurement)) {
      return [];
    }
    
    let results = this.data.get(measurement)!.slice();
    
    // Apply time range filters
    if (query.startTime) {
      results = results.filter(entry => entry.timestamp >= query.startTime!);
    }
    
    if (query.endTime) {
      results = results.filter(entry => entry.timestamp <= query.endTime!);
    }
    
    // Apply tag filters
    if (query.tags) {
      results = results.filter(entry => {
        if (!entry.tags) return false;
        
        return Object.entries(query.tags!).every(([key, value]) => {
          return entry.tags![key] === value;
        });
      });
    }
    
    // Apply sorting
    results.sort((a, b) => {
      const order = query.orderBy === 'desc' ? -1 : 1;
      return order * (a.timestamp.getTime() - b.timestamp.getTime());
    });
    
    // Apply limit
    if (query.limit !== undefined && query.limit > 0) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  async getMetadata(measurement: string): Promise<TimeSeriesMetadata> {
    const entries = this.data.get(measurement) || [];
    
    // Extract all field names from all entries
    const fields = new Set<string>();
    const tags = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.data) {
        Object.keys(entry.data).forEach(field => fields.add(field));
      }
      
      if (entry.tags) {
        Object.keys(entry.tags).forEach(tag => tags.add(tag));
      }
    });
    
    // Find earliest and latest timestamps
    let earliestRecord: Date | undefined;
    let latestRecord: Date | undefined;
    
    if (entries.length > 0) {
      earliestRecord = new Date(Math.min(...entries.map(e => e.timestamp.getTime())));
      latestRecord = new Date(Math.max(...entries.map(e => e.timestamp.getTime())));
    }
    
    return {
      measurement,
      fields: Array.from(fields),
      tags: Array.from(tags),
      earliestRecord,
      latestRecord,
      totalRecords: entries.length
    };
  }
  
  async dropMeasurement(measurement: string): Promise<void> {
    this.data.delete(measurement);
  }
}

/**
 * In-memory implementation of GraphStorage
 * Used for development and testing purposes
 */
export class InMemoryGraphStorage implements GraphStorage {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();
  private nodeEdges: Map<string, Set<string>> = new Map();
  
  async createNode(node: Node): Promise<Node> {
    const nodeId = node.id || uuidv4();
    const now = new Date();
    
    const newNode: Node = {
      ...node,
      id: nodeId,
      createdAt: node.createdAt || now,
      updatedAt: now
    };
    
    this.nodes.set(nodeId, newNode);
    this.nodeEdges.set(nodeId, new Set());
    
    return newNode;
  }
  
  async getNode(id: string): Promise<Node | null> {
    return this.nodes.get(id) || null;
  }
  
  async updateNode(id: string, properties: Record<string, any>): Promise<Node> {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node with id ${id} not found`);
    }
    
    const updatedNode: Node = {
      ...node,
      properties: {
        ...node.properties,
        ...properties
      },
      updatedAt: new Date()
    };
    
    this.nodes.set(id, updatedNode);
    return updatedNode;
  }
  
  async deleteNode(id: string): Promise<void> {
    // First remove any edges connected to this node
    const edgeIds = this.nodeEdges.get(id) || new Set();
    for (const edgeId of Array.from(edgeIds)) {
      await this.deleteEdge(edgeId);
    }
    
    this.nodes.delete(id);
    this.nodeEdges.delete(id);
  }
  
  async createEdge(edge: Edge): Promise<Edge> {
    const edgeId = edge.id || uuidv4();
    const now = new Date();
    
    // Ensure the source and target nodes exist
    if (!this.nodes.has(edge.sourceId)) {
      throw new Error(`Source node with id ${edge.sourceId} not found`);
    }
    
    if (!this.nodes.has(edge.targetId)) {
      throw new Error(`Target node with id ${edge.targetId} not found`);
    }
    
    const newEdge: Edge = {
      ...edge,
      id: edgeId,
      createdAt: edge.createdAt || now,
      updatedAt: now
    };
    
    this.edges.set(edgeId, newEdge);
    
    // Track which nodes this edge connects
    this.nodeEdges.get(edge.sourceId)!.add(edgeId);
    this.nodeEdges.get(edge.targetId)!.add(edgeId);
    
    return newEdge;
  }
  
  async getEdge(id: string): Promise<Edge | null> {
    return this.edges.get(id) || null;
  }
  
  async updateEdge(id: string, properties: Record<string, any>): Promise<Edge> {
    const edge = this.edges.get(id);
    if (!edge) {
      throw new Error(`Edge with id ${id} not found`);
    }
    
    const updatedEdge: Edge = {
      ...edge,
      properties: {
        ...edge.properties,
        ...properties
      },
      updatedAt: new Date()
    };
    
    this.edges.set(id, updatedEdge);
    return updatedEdge;
  }
  
  async deleteEdge(id: string): Promise<void> {
    const edge = this.edges.get(id);
    if (!edge) {
      return; // Edge doesn't exist, nothing to do
    }
    
    // Remove edge from the nodeEdges tracking
    this.nodeEdges.get(edge.sourceId)?.delete(id);
    this.nodeEdges.get(edge.targetId)?.delete(id);
    
    // Remove the edge itself
    this.edges.delete(id);
  }
  
  async query(query: GraphQuery): Promise<{ nodes: Node[], edges: Edge[] }> {
    // This is a simplified query implementation that doesn't do full graph traversal
    // A real implementation would use a proper graph algorithm for traversal
    
    let startNodes: Node[] = [];
    
    // First, find starting nodes based on query criteria
    if (query.startNodeId) {
      const node = this.nodes.get(query.startNodeId);
      if (node) startNodes = [node];
    } else if (query.startNodeType || query.startNodeProperties) {
      startNodes = Array.from(this.nodes.values()).filter(node => {
        let matches = true;
        
        // Check node type
        if (query.startNodeType && node.type !== query.startNodeType) {
          matches = false;
        }
        
        // Check node properties
        if (matches && query.startNodeProperties) {
          for (const [key, value] of Object.entries(query.startNodeProperties)) {
            if (node.properties[key] !== value) {
              matches = false;
              break;
            }
          }
        }
        
        return matches;
      });
    } else {
      // If no start criteria provided, return empty result
      return { nodes: [], edges: [] };
    }
    
    // Early exit if no starting nodes found
    if (startNodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    
    // For this simple implementation, we'll just get direct connections
    // A full graph database would implement proper traversal algorithms
    const resultNodes = new Map<string, Node>();
    const resultEdges = new Map<string, Edge>();
    
    for (const startNode of startNodes) {
      resultNodes.set(startNode.id, startNode);
      
      // Get all edges for this node
      const edgeIds = this.nodeEdges.get(startNode.id) || new Set();
      for (const edgeId of Array.from(edgeIds)) {
        const edge = this.edges.get(edgeId)!;
        
        // Skip if edge type doesn't match (if specified)
        if (query.edgeType && edge.type !== query.edgeType) {
          continue;
        }
        
        resultEdges.set(edge.id, edge);
        
        // Add the node on the other end of the edge
        const otherNodeId = edge.sourceId === startNode.id ? edge.targetId : edge.sourceId;
        const otherNode = this.nodes.get(otherNodeId)!;
        
        // Skip if end node type doesn't match (if specified)
        if (query.endNodeType && otherNode.type !== query.endNodeType) {
          continue;
        }
        
        // Check end node properties (if specified)
        let matchesEndProperties = true;
        if (query.endNodeProperties) {
          for (const [key, value] of Object.entries(query.endNodeProperties)) {
            if (otherNode.properties[key] !== value) {
              matchesEndProperties = false;
              break;
            }
          }
        }
        
        if (matchesEndProperties) {
          resultNodes.set(otherNode.id, otherNode);
        }
      }
    }
    
    // Apply limit if specified
    let nodes = Array.from(resultNodes.values());
    let edges = Array.from(resultEdges.values());
    
    if (query.limit && query.limit > 0) {
      nodes = nodes.slice(0, query.limit);
      
      // Filter edges to only include those connected to our limited nodes
      const nodeIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => 
        nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)
      );
    }
    
    return { nodes, edges };
  }
  
  async findPathBetweenNodes(sourceId: string, targetId: string, maxDepth: number = 3): Promise<{ nodes: Node[], edges: Edge[] }> {
    // This would implement a breadth-first search or Dijkstra's algorithm
    // For now, we'll return a simplified implementation that doesn't fully traverse the graph
    
    // If either node doesn't exist, return empty result
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return { nodes: [], edges: [] };
    }
    
    // Simple case: are the nodes directly connected?
    const sourceEdges = this.nodeEdges.get(sourceId) || new Set();
    const targetEdges = this.nodeEdges.get(targetId) || new Set();
    
    // Look for edges that connect both nodes
    const directEdges: Edge[] = [];
    for (const edgeId of Array.from(sourceEdges)) {
      if (targetEdges.has(edgeId)) {
        const edge = this.edges.get(edgeId)!;
        directEdges.push(edge);
      }
    }
    
    if (directEdges.length > 0) {
      return {
        nodes: [this.nodes.get(sourceId)!, this.nodes.get(targetId)!],
        edges: directEdges
      };
    }
    
    // For simplicity in this mock implementation, return empty result
    // A real implementation would do a proper graph traversal
    return { nodes: [], edges: [] };
  }
}

/**
 * In-memory implementation of HybridStorage
 * Combines TimeSeriesStorage and GraphStorage
 */
export class InMemoryHybridStorage implements HybridStorage {
  public timeSeries: TimeSeriesStorage;
  public graph: GraphStorage;
  
  constructor() {
    this.timeSeries = new InMemoryTimeSeriesStorage();
    this.graph = new InMemoryGraphStorage();
  }
} 