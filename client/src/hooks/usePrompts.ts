/**
 * usePrompts Hook
 *
 * Manages prompt library state and operations.
 * Provides functions to list, create, update, and delete prompts.
 */

import { useState, useEffect, useCallback } from 'react';
import { promptApi } from '../services/promptApi';
import type {
  Prompt,
  PromptCategory,
  PromptCreateRequest,
  PromptUpdateRequest,
} from '../types/prompt';

interface UsePromptsParams {
  /** Filter by category */
  category?: PromptCategory;
  /** Only show favorites */
  favoritesOnly?: boolean;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UsePromptsReturn {
  /** List of prompts */
  prompts: Prompt[];
  /** Total count of prompts */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh prompts from server */
  refresh: () => Promise<void>;
  /** Create a new prompt */
  createPrompt: (data: PromptCreateRequest) => Promise<Prompt>;
  /** Update an existing prompt */
  updatePrompt: (id: number, data: PromptUpdateRequest) => Promise<Prompt>;
  /** Delete a prompt */
  deletePrompt: (id: number) => Promise<void>;
  /** Toggle favorite status */
  toggleFavorite: (id: number) => Promise<Prompt>;
  /** Increment usage count (fire and forget) */
  incrementUsage: (id: number) => void;
  /** Clear error */
  clearError: () => void;
}

export function usePrompts(params?: UsePromptsParams): UsePromptsReturn {
  const { category, favoritesOnly = false, autoFetch = true } = params || {};

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch prompts from server
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await promptApi.listPrompts({
        category,
        favorites_only: favoritesOnly,
      });
      setPrompts(response.prompts);
      setTotal(response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
      setError(errorMessage);
      console.error('Failed to load prompts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category, favoritesOnly]);

  // Auto-fetch on mount and when params change
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [refresh, autoFetch]);

  /**
   * Create a new prompt
   */
  const createPrompt = useCallback(async (data: PromptCreateRequest): Promise<Prompt> => {
    try {
      const newPrompt = await promptApi.createPrompt(data);
      // Add to local state
      setPrompts((prev) => {
        // Insert based on favorite status and alphabetical order
        const updated = [...prev, newPrompt];
        return updated.sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) {
            return a.is_favorite ? -1 : 1;
          }
          if (a.usage_count !== b.usage_count) {
            return b.usage_count - a.usage_count;
          }
          return a.title.localeCompare(b.title);
        });
      });
      setTotal((prev) => prev + 1);
      return newPrompt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create prompt';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Update an existing prompt
   */
  const updatePrompt = useCallback(async (id: number, data: PromptUpdateRequest): Promise<Prompt> => {
    try {
      const updated = await promptApi.updatePrompt(id, data);
      // Update in local state
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prompt';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Delete a prompt
   */
  const deletePrompt = useCallback(async (id: number): Promise<void> => {
    try {
      await promptApi.deletePrompt(id);
      // Remove from local state
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete prompt';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(async (id: number): Promise<Prompt> => {
    try {
      const updated = await promptApi.toggleFavorite(id);
      // Update in local state and re-sort
      setPrompts((prev) => {
        const updatedList = prev.map((p) => (p.id === id ? updated : p));
        return updatedList.sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) {
            return a.is_favorite ? -1 : 1;
          }
          if (a.usage_count !== b.usage_count) {
            return b.usage_count - a.usage_count;
          }
          return a.title.localeCompare(b.title);
        });
      });
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle favorite';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Increment usage count (fire and forget, no error handling)
   */
  const incrementUsage = useCallback((id: number): void => {
    promptApi.incrementUsage(id).then((response) => {
      // Update local state with new usage count
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, usage_count: response.usage_count, last_used_at: response.last_used_at }
            : p
        )
      );
    }).catch(() => {
      // Silently ignore usage increment errors
    });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    prompts,
    total,
    isLoading,
    error,
    refresh,
    createPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    incrementUsage,
    clearError,
  };
}

export default usePrompts;
