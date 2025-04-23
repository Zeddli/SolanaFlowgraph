import { 
  TimeSeriesQuery, 
  TimeSeriesEntry, 
  GraphQuery, 
  Node,
  Edge,
  TimeSeriesStorage,
  GraphStorage
} from './types';

export class StorageManager {
  private timeSeriesStores: Map<string, TimeSeriesStorage>;
  private graphStores: Map<string, GraphStorage>;

  constructor() {
    this.timeSeriesStores = new Map();
    this.graphStores = new Map();
  }

  registerTimeSeriesStore(id: string, store: TimeSeriesStorage): void {
    this.timeSeriesStores.set(id, store);
  }

  registerGraphStore(id: string, store: GraphStorage): void {
    this.graphStores.set(id, store);
  }

  async getAllTimeSeriesData(query: TimeSeriesQuery): Promise<TimeSeriesEntry[]> {
    const results: TimeSeriesEntry[] = [];
    
    // Query all time series stores
    await Promise.all(
      Array.from(this.timeSeriesStores.values()).map(async (store) => {
        try {
          const data = await store.query("default", query);
          results.push(...data);
        } catch (error) {
          console.error(`Error querying time series store: ${error}`);
        }
      })
    );
    
    // Sort results by timestamp
    return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getAllGraphData(query: GraphQuery): Promise<{ nodes: Node[], edges: Edge[] }[]> {
    const results: { nodes: Node[], edges: Edge[] }[] = [];
    
    // Query all graph stores
    await Promise.all(
      Array.from(this.graphStores.values()).map(async (store) => {
        try {
          const data = await store.query(query);
          results.push(data);
        } catch (error) {
          console.error(`Error querying graph store: ${error}`);
        }
      })
    );
    
    return results;
  }
} 