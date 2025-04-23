import { HybridStorage } from './types';

/**
 * Entity tag for identifying and categorizing on-chain entities
 */
export interface EntityTag {
  id: string;
  entityType: 'wallet' | 'program' | 'token' | 'nft';
  entityId: string;
  tagName: string;
  tagValue?: string;
  confidence?: number; // 0-100
  source: 'manual' | 'algorithm' | 'external';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Common tag categories for entities
 */
export enum TagCategory {
  // Core identity tags
  IDENTITY = 'identity',
  
  // Activity-based tags
  BEHAVIOR = 'behavior',
  
  // Risk assessment tags
  RISK = 'risk',
  
  // Custom categories
  CUSTOM = 'custom'
}

/**
 * Standard tag names for wallets
 */
export enum WalletTagName {
  // Identity tags
  NAME = 'name',
  OWNER = 'owner',
  EXCHANGE = 'exchange',
  PROTOCOL = 'protocol',
  VALIDATOR = 'validator',
  DEVELOPER = 'developer',
  DAO = 'dao',
  
  // Behavioral tags
  HIGH_VOLUME = 'high_volume',
  ACTIVE_TRADER = 'active_trader',
  NFT_COLLECTOR = 'nft_collector',
  LIQUIDITY_PROVIDER = 'liquidity_provider',
  
  // Risk tags
  SUSPICIOUS = 'suspicious',
  HACKED = 'hacked',
  MIXER = 'mixer',
  SANCTIONED = 'sanctioned'
}

/**
 * Standard tag names for programs
 */
export enum ProgramTagName {
  // Identity tags
  NAME = 'name',
  VERSION = 'version',
  CATEGORY = 'category',
  
  // Behavioral tags
  HIGH_USAGE = 'high_usage',
  DEPRECATED = 'deprecated',
  
  // Risk tags
  EXPLOITED = 'exploited',
  VULNERABLE = 'vulnerable',
  REENTRANCY = 'reentrancy',
  UNVERIFIED = 'unverified'
}

/**
 * Entity tag repository
 * Handles storage and retrieval of tags using both time-series and graph databases
 */
export class TagRepository {
  private storage: HybridStorage;
  private tagCache: Map<string, EntityTag[]> = new Map();
  
  constructor(storage: HybridStorage) {
    this.storage = storage;
  }
  
  /**
   * Add or update a tag for an entity
   */
  async addTag(tag: EntityTag): Promise<void> {
    // Ensure the tag has an ID
    if (!tag.id) {
      tag.id = `${tag.entityType}_${tag.entityId}_${tag.tagName}_${Date.now()}`;
    }
    
    // Set timestamps
    tag.updatedAt = new Date();
    if (!tag.createdAt) {
      tag.createdAt = new Date();
    }
    
    // Store tag in time-series database
    await this.storage.timeSeries.insert('entity_tags', {
      timestamp: tag.updatedAt,
      data: tag,
      tags: {
        entityType: tag.entityType,
        entityId: tag.entityId,
        tagName: tag.tagName,
        source: tag.source
      }
    });
    
    // Also update the corresponding entity in the graph database
    try {
      if (tag.entityType === 'wallet' || tag.entityType === 'program') {
        // Try to find the node first
        const nodeQuery = {
          nodeIds: [tag.entityId]
        };
        
        const result = await this.storage.graph.query(nodeQuery);
        
        if (result.nodes.length > 0) {
          // Node exists, update it
          await this.storage.graph.updateNode(tag.entityId, {
            [`tags.${tag.tagName}`]: tag.tagValue || true,
            updatedAt: tag.updatedAt
          });
        } else {
          // Node doesn't exist yet, create it
          await this.storage.graph.createNode({
            id: tag.entityId,
            type: tag.entityType === 'wallet' ? 'Wallet' : 'Program',
            properties: {
              address: tag.entityId,
              tags: {
                [tag.tagName]: tag.tagValue || true
              },
              lastSeen: new Date()
            },
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt
          });
        }
      }
    } catch (error) {
      console.error('Error updating graph database with tag:', error);
      // Don't fail the whole operation if graph update fails
    }
    
    // Update cache
    this.invalidateCache(tag.entityType, tag.entityId);
  }
  
  /**
   * Remove a tag from an entity
   */
  async removeTag(tag: EntityTag): Promise<void> {
    // Delete from time-series database
    // Note: This is a logical delete by adding a 'deleted' field
    await this.storage.timeSeries.insert('entity_tags', {
      timestamp: new Date(),
      data: {
        ...tag,
        deleted: true,
        updatedAt: new Date()
      },
      tags: {
        entityType: tag.entityType,
        entityId: tag.entityId,
        tagName: tag.tagName,
        deleted: true
      }
    });
    
    // Update the node in graph database
    try {
      if (tag.entityType === 'wallet' || tag.entityType === 'program') {
        // Try to find the node first
        const nodeQuery = {
          nodeIds: [tag.entityId]
        };
        
        const result = await this.storage.graph.query(nodeQuery);
        
        if (result.nodes.length > 0) {
          // Node exists, update it to remove the tag
          // Since the graph database doesn't support removing a property directly,
          // we need to set it to null or undefined
          await this.storage.graph.updateNode(tag.entityId, {
            [`tags.${tag.tagName}`]: null,
            updatedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error removing tag from graph database:', error);
    }
    
    // Update cache
    this.invalidateCache(tag.entityType, tag.entityId);
  }
  
  /**
   * Get all tags for a specific entity
   */
  async getTagsForEntity(entityType: string, entityId: string): Promise<EntityTag[]> {
    const cacheKey = `${entityType}_${entityId}`;
    
    // Check cache first
    if (this.tagCache.has(cacheKey)) {
      return this.tagCache.get(cacheKey) || [];
    }
    
    // Query time-series database
    const result = await this.storage.timeSeries.query('entity_tags', {
      tags: {
        entityType,
        entityId
      }
    });
    
    // Filter out deleted tags and get the latest version of each tag
    const tagMap = new Map<string, EntityTag>();
    
    for (const entry of result) {
      const tag = entry.data as EntityTag;
      
      // Skip deleted tags
      if (tag.deleted) {
        tagMap.delete(`${tag.tagName}_${tag.source || ''}`);
        continue;
      }
      
      const key = `${tag.tagName}_${tag.source || ''}`;
      const existing = tagMap.get(key);
      
      if (!existing || new Date(tag.updatedAt) > new Date(existing.updatedAt)) {
        tagMap.set(key, tag);
      }
    }
    
    const tags = Array.from(tagMap.values());
    
    // Update cache
    this.tagCache.set(cacheKey, tags);
    
    return tags;
  }
  
  /**
   * Search for entities by tags
   */
  async searchByTags(
    tagNames: string[],
    options?: {
      entityTypes?: string[];
      minConfidence?: number;
      limit?: number;
    }
  ): Promise<string[]> {
    const { entityTypes = ['wallet', 'program', 'token', 'nft'], minConfidence = 0, limit = 100 } = options || {};
    
    // Build query
    const tagQueries = tagNames.map(tagName => {
      return {
        tags: { tagName }
      };
    });
    
    const entityIds = new Set<string>();
    
    // Execute multiple queries to get all matches
    for (const query of tagQueries) {
      const result = await this.storage.timeSeries.query('entity_tags', query);
      
      // Filter and collect entity IDs
      for (const entry of result) {
        const tag = entry.data as EntityTag;
        
        // Apply filters
        if (
          !tag.deleted &&
          entityTypes.includes(tag.entityType) &&
          (!tag.confidence || tag.confidence >= minConfidence)
        ) {
          entityIds.add(tag.entityId);
        }
        
        // Apply limit
        if (entityIds.size >= limit) {
          break;
        }
      }
    }
    
    return Array.from(entityIds);
  }
  
  /**
   * Search for entities where tags match a specific value
   */
  async searchByTagValue(
    tagName: string,
    tagValue: string,
    options?: {
      entityTypes?: string[];
      exact?: boolean;
      limit?: number;
    }
  ): Promise<EntityTag[]> {
    const { entityTypes = ['wallet', 'program', 'token', 'nft'], exact = true, limit = 100 } = options || {};
    
    // Query time-series database
    const result = await this.storage.timeSeries.query('entity_tags', {
      tags: { tagName }
    });
    
    // Filter tags by value and collect
    const matchingTags: EntityTag[] = [];
    
    for (const entry of result) {
      const tag = entry.data as EntityTag;
      
      // Apply filters
      if (
        !tag.deleted &&
        entityTypes.includes(tag.entityType) &&
        (
          (exact && tag.tagValue === tagValue) ||
          (!exact && tag.tagValue && tag.tagValue.toLowerCase().includes(tagValue.toLowerCase()))
        )
      ) {
        matchingTags.push(tag);
      }
      
      // Apply limit
      if (matchingTags.length >= limit) {
        break;
      }
    }
    
    return matchingTags;
  }
  
  /**
   * Get all entities with a specific tag
   */
  async getEntitiesWithTag(
    tagName: string,
    options?: {
      entityTypes?: string[];
      limit?: number;
    }
  ): Promise<EntityTag[]> {
    const { entityTypes = ['wallet', 'program', 'token', 'nft'], limit = 100 } = options || {};
    
    // Query time-series database
    const result = await this.storage.timeSeries.query('entity_tags', {
      tags: { tagName }
    });
    
    // Filter and collect the latest version of each tag
    const tagMap = new Map<string, EntityTag>();
    
    for (const entry of result) {
      const tag = entry.data as EntityTag;
      
      // Skip deleted tags and non-matching entity types
      if (tag.deleted || !entityTypes.includes(tag.entityType)) {
        continue;
      }
      
      const key = `${tag.entityType}_${tag.entityId}`;
      const existing = tagMap.get(key);
      
      if (!existing || new Date(tag.updatedAt) > new Date(existing.updatedAt)) {
        tagMap.set(key, tag);
      }
      
      // Apply limit
      if (tagMap.size >= limit) {
        break;
      }
    }
    
    return Array.from(tagMap.values());
  }
  
  /**
   * Bulk import tags from external sources
   */
  async bulkImportTags(tags: EntityTag[]): Promise<number> {
    let importCount = 0;
    
    for (const tag of tags) {
      try {
        await this.addTag(tag);
        importCount++;
      } catch (error) {
        console.error(`Error importing tag ${tag.id}:`, error);
      }
    }
    
    return importCount;
  }
  
  /**
   * Invalidate the cache for a specific entity
   */
  private invalidateCache(entityType: string, entityId: string): void {
    const cacheKey = `${entityType}_${entityId}`;
    this.tagCache.delete(cacheKey);
  }
  
  /**
   * Clear the entire tag cache
   */
  clearCache(): void {
    this.tagCache.clear();
  }
} 