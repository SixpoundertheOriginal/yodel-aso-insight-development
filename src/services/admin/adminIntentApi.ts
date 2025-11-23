/**
 * Intent Pattern Admin API
 *
 * Phase 16: Intent Intelligence Registry - Admin API Layer
 *
 * Provides HTTP-style API interface for React Query hooks.
 * All operations handle auth, validation, and cache invalidation.
 */

import {
  getAllIntentPatternsWithAdminMeta,
  getIntentPatternWithAdminMeta,
  getPatternsByIntentType,
  getPatternsByScope,
  getEffectiveIntentPatterns,
  createIntentPattern,
  updateIntentPattern,
  deleteIntentPattern,
  createOrUpdateIntentOverride,
  deleteIntentOverride,
  getIntentPatternStatistics,
  getAllPatternTags,
} from './adminIntentService';
import type {
  IntentPatternWithAdminMeta,
  IntentPatternFilters,
  CreateIntentPatternRequest,
  UpdateIntentPatternRequest,
  CreateIntentOverrideRequest,
  IntentType,
  IntentScope,
} from './adminIntentService';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Intent pattern registry response
 */
export interface IntentPatternRegistryResponse {
  patterns: IntentPatternWithAdminMeta[];
  statistics: {
    total: number;
    active: number;
    inactive: number;
    withOverrides: number;
    byIntentType: Record<IntentType, number>;
    byScope: Record<IntentScope, number>;
    regex: number;
    caseSensitive: number;
    averageWeight: number;
    averagePriority: number;
  };
  tags: string[];
}

/**
 * Intent pattern detail response
 */
export interface IntentPatternDetailResponse {
  pattern: IntentPatternWithAdminMeta;
  canDelete: boolean;
  deletionBlocker?: string;
  relatedPatterns?: IntentPatternWithAdminMeta[];
}

/**
 * Effective patterns response (with overrides applied)
 */
export interface EffectiveIntentPatternsResponse {
  patterns: IntentPatternWithAdminMeta[];
  context: {
    vertical?: string;
    market?: string;
    organizationId?: string;
    appId?: string;
  };
  overrideCount: number;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Admin API for intent pattern registry
 */
export class AdminIntentApi {
  /**
   * Get complete intent pattern registry with statistics
   *
   * @param filters - Optional filters
   * @returns Pattern registry with statistics and tags
   */
  static async getIntentPatternRegistry(
    filters?: IntentPatternFilters
  ): Promise<IntentPatternRegistryResponse> {
    try {
      const [patterns, statistics, tags] = await Promise.all([
        getAllIntentPatternsWithAdminMeta(filters),
        getIntentPatternStatistics(),
        getAllPatternTags(),
      ]);

      return {
        patterns,
        statistics,
        tags,
      };
    } catch (error) {
      console.error('Error fetching intent pattern registry:', error);
      throw new Error('Failed to fetch intent pattern registry');
    }
  }

  /**
   * Get single intent pattern with detail
   *
   * @param patternId - Pattern UUID
   * @param filters - Optional context filters
   * @returns Pattern detail or null
   */
  static async getIntentPatternDetail(
    patternId: string,
    filters?: IntentPatternFilters
  ): Promise<IntentPatternDetailResponse | null> {
    try {
      const pattern = await getIntentPatternWithAdminMeta(patternId, filters);
      if (!pattern) return null;

      // Find related patterns (same intent type)
      const relatedPatterns = await getPatternsByIntentType(pattern.intent_type);
      const relatedFiltered = relatedPatterns
        .filter((p) => p.id !== patternId)
        .slice(0, 5); // Limit to 5 related patterns

      // Check if pattern can be deleted
      const canDelete = pattern.scope !== 'base' || !pattern.has_override;
      const deletionBlocker = canDelete
        ? undefined
        : 'Base patterns with active overrides cannot be deleted';

      return {
        pattern,
        canDelete,
        deletionBlocker,
        relatedPatterns: relatedFiltered,
      };
    } catch (error) {
      console.error(`Error fetching intent pattern detail for ${patternId}:`, error);
      return null;
    }
  }

  /**
   * Get patterns by intent type
   *
   * @param intentType - Intent type filter
   * @returns Patterns for the specified type
   */
  static async getPatternsByIntentType(
    intentType: IntentType
  ): Promise<IntentPatternWithAdminMeta[]> {
    try {
      return await getPatternsByIntentType(intentType);
    } catch (error) {
      console.error(`Error fetching patterns by intent type ${intentType}:`, error);
      return [];
    }
  }

  /**
   * Get patterns by scope
   *
   * @param scope - Scope filter
   * @returns Patterns for the specified scope
   */
  static async getPatternsByScope(
    scope: IntentScope
  ): Promise<IntentPatternWithAdminMeta[]> {
    try {
      return await getPatternsByScope(scope);
    } catch (error) {
      console.error(`Error fetching patterns by scope ${scope}:`, error);
      return [];
    }
  }

  /**
   * Get effective patterns for a given context
   *
   * Returns patterns with overrides applied based on scope precedence.
   *
   * @param vertical - Vertical context
   * @param market - Market context
   * @param organizationId - Organization context
   * @param appId - App context
   * @returns Effective patterns with override count
   */
  static async getEffectivePatterns(
    vertical?: string,
    market?: string,
    organizationId?: string,
    appId?: string
  ): Promise<EffectiveIntentPatternsResponse> {
    try {
      const patterns = await getEffectiveIntentPatterns(
        vertical,
        market,
        organizationId,
        appId
      );

      const overrideCount = patterns.filter((p) => p.has_override).length;

      return {
        patterns,
        context: {
          vertical,
          market,
          organizationId,
          appId,
        },
        overrideCount,
      };
    } catch (error) {
      console.error('Error fetching effective patterns:', error);
      throw new Error('Failed to fetch effective patterns');
    }
  }

  /**
   * Get all unique tags
   *
   * @returns Array of unique tags
   */
  static async getAllTags(): Promise<string[]> {
    try {
      return await getAllPatternTags();
    } catch (error) {
      console.error('Error fetching pattern tags:', error);
      return [];
    }
  }

  // ============================================================================
  // Mutation Operations - Patterns
  // ============================================================================

  /**
   * Create new intent pattern
   *
   * @param request - Pattern creation request
   * @returns Created pattern ID or null
   */
  static async createPattern(request: CreateIntentPatternRequest): Promise<string | null> {
    try {
      // Validate weight bounds
      if (request.weight !== undefined) {
        if (request.weight < 0.1 || request.weight > 3.0) {
          console.error('Pattern weight must be between 0.1 and 3.0');
          return null;
        }
      }

      const patternId = await createIntentPattern(request);

      if (patternId) {
        console.log('Intent pattern created:', patternId);
      }

      return patternId;
    } catch (error) {
      console.error('Error creating intent pattern:', error);
      return null;
    }
  }

  /**
   * Update intent pattern metadata
   *
   * @param request - Pattern update request
   * @returns Success boolean
   */
  static async updatePattern(request: UpdateIntentPatternRequest): Promise<boolean> {
    try {
      // Validate weight bounds if provided
      if (request.weight !== undefined) {
        if (request.weight < 0.1 || request.weight > 3.0) {
          console.error('Pattern weight must be between 0.1 and 3.0');
          return false;
        }
      }

      const success = await updateIntentPattern(request);

      if (success) {
        console.log('Intent pattern updated:', request.patternId);
      }

      return success;
    } catch (error) {
      console.error('Error updating intent pattern:', error);
      return false;
    }
  }

  /**
   * Delete intent pattern
   *
   * Soft delete by marking pattern as inactive.
   *
   * @param patternId - Pattern UUID to delete
   * @returns Success boolean
   */
  static async deletePattern(patternId: string): Promise<boolean> {
    try {
      // Check if pattern can be deleted
      const detail = await this.getIntentPatternDetail(patternId);
      if (!detail || !detail.canDelete) {
        console.error('Pattern cannot be deleted:', detail?.deletionBlocker);
        return false;
      }

      const success = await deleteIntentPattern(patternId);

      if (success) {
        console.log('Intent pattern deleted:', patternId);
      }

      return success;
    } catch (error) {
      console.error('Error deleting intent pattern:', error);
      return false;
    }
  }

  // ============================================================================
  // Mutation Operations - Overrides
  // ============================================================================

  /**
   * Create or update intent pattern override
   *
   * @param request - Override creation/update request
   * @returns Success boolean
   */
  static async createOrUpdateOverride(
    request: CreateIntentOverrideRequest
  ): Promise<boolean> {
    try {
      // Validate weight multiplier if provided
      if (request.weightMultiplier !== undefined) {
        if (request.weightMultiplier < 0.1 || request.weightMultiplier > 3.0) {
          console.error('Weight multiplier must be between 0.1 and 3.0');
          return false;
        }
      }

      // Validate scope context
      if (request.scope === 'vertical' && !request.vertical) {
        console.error('Vertical override requires vertical parameter');
        return false;
      }
      if (request.scope === 'market' && !request.market) {
        console.error('Market override requires market parameter');
        return false;
      }
      if (request.scope === 'client' && !request.organizationId) {
        console.error('Client override requires organizationId parameter');
        return false;
      }
      if (request.scope === 'app' && !request.appId) {
        console.error('App override requires appId parameter');
        return false;
      }

      const success = await createOrUpdateIntentOverride(request);

      if (success) {
        console.log('Intent pattern override created/updated:', request.basePatternId);
      }

      return success;
    } catch (error) {
      console.error('Error creating/updating intent override:', error);
      return false;
    }
  }

  /**
   * Delete intent pattern override
   *
   * @param overrideId - Override UUID to delete
   * @returns Success boolean
   */
  static async deleteOverride(overrideId: string): Promise<boolean> {
    try {
      const success = await deleteIntentOverride(overrideId);

      if (success) {
        console.log('Intent pattern override deleted:', overrideId);
      }

      return success;
    } catch (error) {
      console.error('Error deleting intent override:', error);
      return false;
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Create multiple patterns in batch
   *
   * @param requests - Array of pattern creation requests
   * @returns Array of created pattern IDs (null for failures)
   */
  static async createPatternsBatch(
    requests: CreateIntentPatternRequest[]
  ): Promise<(string | null)[]> {
    try {
      const results = await Promise.all(requests.map((req) => this.createPattern(req)));
      const successCount = results.filter((id) => id !== null).length;
      console.log(`Batch created ${successCount}/${requests.length} patterns`);
      return results;
    } catch (error) {
      console.error('Error in batch pattern creation:', error);
      return requests.map(() => null);
    }
  }

  /**
   * Delete multiple patterns in batch
   *
   * @param patternIds - Array of pattern UUIDs to delete
   * @returns Array of success booleans
   */
  static async deletePatternsBatch(patternIds: string[]): Promise<boolean[]> {
    try {
      const results = await Promise.all(patternIds.map((id) => this.deletePattern(id)));
      const successCount = results.filter((success) => success).length;
      console.log(`Batch deleted ${successCount}/${patternIds.length} patterns`);
      return results;
    } catch (error) {
      console.error('Error in batch pattern deletion:', error);
      return patternIds.map(() => false);
    }
  }
}

export default AdminIntentApi;
