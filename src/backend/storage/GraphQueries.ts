/**
 * Predefined Cypher queries for graph database operations
 * These queries handle common analytics use cases for on-chain relationship analysis
 */

// Wallet-centric queries
export const getWalletInteractions = `
  MATCH (w:Wallet {address: $walletAddress})
  MATCH (w)-[r]-(other)
  RETURN w, r, other
  ORDER BY r.timestamp DESC
  LIMIT $limit
`;

export const getWalletAssets = `
  MATCH (w:Wallet {address: $walletAddress})-[r:OWNS]->(t:Token)
  RETURN w, r, t
  ORDER BY r.amount DESC
`;

export const getWalletPrograms = `
  MATCH (w:Wallet {address: $walletAddress})-[r:INTERACTS]->(p:Program)
  RETURN w, r, p, 
    count(r) as interactionCount,
    max(r.timestamp) as lastInteraction
  ORDER BY interactionCount DESC
`;

// Program-centric queries
export const getProtocolUsage = `
  MATCH (p:Program {address: $programAddress})
  MATCH path = (wallet:Wallet)-[r:INTERACTS]->(p)
  RETURN wallet, r, p
  ORDER BY r.timestamp DESC
  LIMIT $limit
`;

export const getTopProtocolUsers = `
  MATCH (p:Program {address: $programAddress})
  MATCH (wallet:Wallet)-[r:INTERACTS]->(p)
  RETURN wallet.address, count(r) as interactionCount
  ORDER BY interactionCount DESC
  LIMIT $limit
`;

export const getProtocolActivity = `
  MATCH (p:Program {address: $programAddress})
  MATCH (wallet:Wallet)-[r:INTERACTS {timestamp: datetime($date)}]->(p)
  RETURN count(r) as activityCount
`;

// Path finding and relationship queries
export const findConnectedWallets = `
  MATCH (w1:Wallet {address: $sourceAddress})
  MATCH (w2:Wallet {address: $targetAddress})
  MATCH path = shortestPath((w1)-[*..5]-(w2))
  RETURN path
`;

export const findCommonPrograms = `
  MATCH (w1:Wallet {address: $address1})
  MATCH (w2:Wallet {address: $address2})
  MATCH (w1)-[:INTERACTS]->(p:Program)<-[:INTERACTS]-(w2)
  RETURN p.address, p.name, count(*) as commonInteractions
  ORDER BY commonInteractions DESC
`;

// Cluster and community detection
export const findWalletCluster = `
  MATCH (w:Wallet {address: $walletAddress})
  MATCH path = (w)-[*..2]-(related:Wallet)
  WHERE related.address <> $walletAddress
  RETURN related.address, count(path) as relationshipStrength
  ORDER BY relationshipStrength DESC
  LIMIT $limit
`;

// Money flow tracing
export const traceMoneyFlow = `
  MATCH (source:Wallet {address: $sourceAddress})
  MATCH path = (source)-[:SENDS*1..5]->(destination:Wallet)
  WHERE NOT (destination)-[:SENDS]->()
  RETURN path
  LIMIT $limit
`;

// Token transfer analysis
export const getTokenTransfers = `
  MATCH (token:Token {address: $tokenAddress})
  MATCH (sender:Wallet)-[t:SENDS {token: $tokenAddress}]->(receiver:Wallet)
  RETURN sender, t, receiver
  ORDER BY t.timestamp DESC
  LIMIT $limit
`;

// Complex pattern queries
export const findCyclePatterns = `
  MATCH cycle = (w1:Wallet)-[:SENDS]->(:Wallet)-[:SENDS]->(:Wallet)-[:SENDS]->(w1)
  WHERE length(cycle) >= 3
  RETURN cycle
  LIMIT $limit
`;

export const findHighValueTransactions = `
  MATCH (sender:Wallet)-[t:SENDS]->(receiver:Wallet)
  WHERE t.amount >= $threshold
  RETURN sender, t, receiver
  ORDER BY t.amount DESC
  LIMIT $limit
`;

export const findUnusualPatterns = `
  MATCH (w:Wallet)
  WHERE size((w)-[:INTERACTS]->()) > $programThreshold
  AND size((w)-[:SENDS]->()) > $transactionThreshold
  RETURN w.address, 
         size((w)-[:INTERACTS]->()) as programCount,
         size((w)-[:SENDS]->()) as transactionCount
  ORDER BY programCount + transactionCount DESC
  LIMIT $limit
`;

export const findRecentlyActiveWallets = `
  MATCH (w:Wallet)-[r]-()
  WHERE r.timestamp >= datetime($since)
  RETURN w.address, count(r) as activityCount
  ORDER BY activityCount DESC
  LIMIT $limit
`;

// Analysis help functions
export interface CypherParams {
  [key: string]: any;
}

export function buildQueryWithParams(
  query: string,
  params: CypherParams,
  options: { limit?: number; offset?: number } = {}
): { cypher: string; params: CypherParams } {
  let modifiedQuery = query;
  const modifiedParams = { ...params };
  
  // Add pagination if needed
  if (options.limit !== undefined) {
    if (modifiedQuery.toLowerCase().includes('limit')) {
      // Replace existing limit
      modifiedQuery = modifiedQuery.replace(/LIMIT\s+\$limit/i, `LIMIT ${options.limit}`);
      delete modifiedParams.limit;
    } else {
      // Add limit
      modifiedQuery += `\nLIMIT ${options.limit}`;
    }
  }
  
  if (options.offset !== undefined) {
    if (modifiedQuery.toLowerCase().includes('skip')) {
      // Replace existing skip
      modifiedQuery = modifiedQuery.replace(/SKIP\s+\$skip/i, `SKIP ${options.offset}`);
      delete modifiedParams.skip;
    } else {
      // Add skip before LIMIT if it exists
      if (modifiedQuery.toLowerCase().includes('limit')) {
        modifiedQuery = modifiedQuery.replace(
          /LIMIT/i, 
          `SKIP ${options.offset}\nLIMIT`
        );
      } else {
        modifiedQuery += `\nSKIP ${options.offset}`;
      }
    }
  }
  
  return { cypher: modifiedQuery, params: modifiedParams };
} 