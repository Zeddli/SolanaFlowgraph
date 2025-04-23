/**
 * Types for the hybrid storage system
 */

import { PublicKey } from "@solana/web3.js";

// Time-Series Database Types

export interface TimeSeriesEntry {
  timestamp: Date;
  data: any;
  tags?: Record<string, string | number | boolean>;
}

export interface TimeSeriesQuery {
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  tags?: Record<string, string | number | boolean>;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string[];
  orderBy?: 'asc' | 'desc';
}

export interface TimeSeriesMetadata {
  measurement: string;
  fields: string[];
  tags: string[];
  earliestRecord?: Date;
  latestRecord?: Date;
  totalRecords: number;
}

// Graph Database Types

export enum NodeType {
  WALLET = 'wallet',
  TOKEN = 'token',
  PROGRAM = 'program',
  NFT = 'nft',
  VALIDATOR = 'validator',
  TRANSACTION = 'transaction'
}

export interface Node {
  id: string;
  type: NodeType;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphQuery {
  startNodeId?: string;
  startNodeType?: NodeType;
  startNodeProperties?: Record<string, any>;
  edgeType?: string;
  maxDepth?: number;
  limit?: number;
  endNodeType?: NodeType;
  endNodeProperties?: Record<string, any>;
}

// Solana-specific entity types

export interface WalletNode extends Node {
  type: NodeType.WALLET;
  properties: {
    publicKey: string;
    firstSeen: Date;
    lastSeen: Date;
    balance?: number;
    label?: string;
    tags?: string[];
    isContract?: boolean;
  };
}

export interface TokenNode extends Node {
  type: NodeType.TOKEN;
  properties: {
    mint: string;
    symbol?: string;
    name?: string;
    decimals: number;
    supply?: string;
    logoURI?: string;
    tags?: string[];
  };
}

export interface ProgramNode extends Node {
  type: NodeType.PROGRAM;
  properties: {
    address: string;
    name?: string;
    description?: string;
    version?: string;
    isNative?: boolean;
    category?: string;
  };
}

export interface TransactionNode extends Node {
  type: NodeType.TRANSACTION;
  properties: {
    signature: string;
    slot: number;
    blockTime: number;
    fee: number;
    success: boolean;
    programIds: string[];
    recentBlockhash: string;
  };
}

// Edge Types

export enum EdgeType {
  TRANSFER = 'transfer',
  SWAP = 'swap',
  MINT = 'mint',
  BURN = 'burn',
  STAKE = 'stake',
  OWNS = 'owns',
  INTERACTS_WITH = 'interacts_with',
  CREATED = 'created'
}

export interface TransferEdge extends Edge {
  type: EdgeType.TRANSFER;
  properties: {
    amount: string;
    timestamp: Date;
    token?: string; // Token mint address if token transfer
    transactionSignature: string;
    fee?: number;
  };
}

// Storage Interfaces

export interface TimeSeriesStorage {
  insert(measurement: string, entry: TimeSeriesEntry): Promise<void>;
  insertBatch(measurement: string, entries: TimeSeriesEntry[]): Promise<void>;
  query(measurement: string, query: TimeSeriesQuery): Promise<TimeSeriesEntry[]>;
  getMetadata(measurement: string): Promise<TimeSeriesMetadata>;
  dropMeasurement(measurement: string): Promise<void>;
}

export interface GraphStorage {
  createNode(node: Node): Promise<Node>;
  getNode(id: string): Promise<Node | null>;
  updateNode(id: string, properties: Record<string, any>): Promise<Node>;
  deleteNode(id: string): Promise<void>;
  
  createEdge(edge: Edge): Promise<Edge>;
  getEdge(id: string): Promise<Edge | null>;
  updateEdge(id: string, properties: Record<string, any>): Promise<Edge>;
  deleteEdge(id: string): Promise<void>;
  
  query(query: GraphQuery): Promise<{ nodes: Node[], edges: Edge[] }>;
  findPathBetweenNodes(sourceId: string, targetId: string, maxDepth?: number): Promise<{ nodes: Node[], edges: Edge[] }>;
}

export interface HybridStorage {
  timeSeries: TimeSeriesStorage;
  graph: GraphStorage;
} 