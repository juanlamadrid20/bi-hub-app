/**
 * PromptModal Component
 *
 * Modal for browsing, selecting, and managing prompts from the library.
 * Supports filtering by category and favorites, and inline editing.
 */

import { useState, useMemo, useCallback } from 'react';
import { usePrompts } from '../../hooks/usePrompts';
import { PromptForm } from './PromptForm';
import type { Prompt, PromptCategory, PromptCreateRequest, PromptUpdateRequest } from '../../types/prompt';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types/prompt';

interface PromptModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when a prompt is selected */
  onSelectPrompt: (prompt: Prompt) => void;
}

type ModalView = 'list' | 'edit' | 'create';

export function PromptModal({
  isOpen,
  onClose,
  onSelectPrompt,
}: PromptModalProps) {
  const { 
    prompts, 
    isLoading, 
    error,
    toggleFavorite, 
    createPrompt, 
    updatePrompt, 
    deletePrompt,
    clearError,
  } = usePrompts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | ''>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // View state
  const [view, setView] = useState<ModalView>('list');
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter prompts based on search, category, and favorites
  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !prompt.title.toLowerCase().includes(query) &&
          !prompt.description?.toLowerCase().includes(query) &&
          !prompt.content.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      // Category filter
      if (selectedCategory && prompt.category !== selectedCategory) {
        return false;
      }
      // Favorites filter
      if (showFavoritesOnly && !prompt.is_favorite) {
        return false;
      }
      return true;
    });
  }, [prompts, searchQuery, selectedCategory, showFavoritesOnly]);

  // Group prompts by category
  const groupedPrompts = useMemo(() => {
    const groups: Record<PromptCategory, Prompt[]> = {
      customer: [],
      inventory: [],
      analytics: [],
      reporting: [],
      general: [],
    };
    filteredPrompts.forEach((prompt) => {
      groups[prompt.category].push(prompt);
    });
    return groups;
  }, [filteredPrompts]);

  const handleSelectPrompt = (prompt: Prompt) => {
    onSelectPrompt(prompt);
    onClose();
  };

  const handleToggleFavorite = async (e: React.MouseEvent, promptId: number) => {
    e.stopPropagation();
    await toggleFavorite(promptId);
  };

  const handleEditClick = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setFormError(null);
    setView('edit');
  };

  const handleCreateClick = () => {
    setEditingPrompt(null);
    setFormError(null);
    setView('create');
  };

  const handleDeleteClick = async (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${prompt.title}"? This cannot be undone.`)) {
      try {
        await deletePrompt(prompt.id);
      } catch (err) {
        console.error('Failed to delete prompt:', err);
      }
    }
  };

  const handleFormClose = () => {
    setView('list');
    setEditingPrompt(null);
    setFormError(null);
  };

  const handleFormSave = useCallback(async (data: PromptCreateRequest | PromptUpdateRequest, id?: number) => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (id) {
        // Update existing
        await updatePrompt(id, data as PromptUpdateRequest);
      } else {
        // Create new
        await createPrompt(data as PromptCreateRequest);
      }
      setView('list');
      setEditingPrompt(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save prompt';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [createPrompt, updatePrompt]);

  const handleClose = () => {
    setView('list');
    setEditingPrompt(null);
    setFormError(null);
    clearError();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* Show form view */}
        {(view === 'edit' || view === 'create') ? (
          <>
            {/* Form Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <button
                onClick={handleFormClose}
                className="flex items-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to List
              </button>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Form Content */}
            <div className="flex-1 overflow-y-auto">
              <PromptForm
                prompt={editingPrompt}
                onClose={handleFormClose}
                onSave={handleFormSave}
                isSaving={isSaving}
                error={formError}
              />
            </div>
          </>
        ) : (
          <>
            {/* List Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select a Prompt
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCreateClick}
                    className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search and filters */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           placeholder-gray-400 dark:placeholder-slate-400"
                />

                <div className="flex items-center space-x-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as PromptCategory | '')}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                             bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {CATEGORY_ICONS[value as PromptCategory]} {label}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFavoritesOnly}
                      onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      Favorites
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading prompts...
                </div>
              ) : error ? (
                <div className="text-center text-red-500 dark:text-red-400 py-8">
                  <p>{error}</p>
                  <button 
                    onClick={clearError}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No prompts found</p>
                  <p className="text-sm mt-1">
                    {searchQuery || selectedCategory || showFavoritesOnly
                      ? 'Try adjusting your filters'
                      : 'Click "New" to create your first prompt'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => {
                    if (categoryPrompts.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center">
                          <span className="mr-2">
                            {CATEGORY_ICONS[category as PromptCategory]}
                          </span>
                          {CATEGORY_LABELS[category as PromptCategory]}
                        </h3>
                        <div className="space-y-2">
                          {categoryPrompts.map((prompt) => (
                            <div
                              key={prompt.id}
                              onClick={() => handleSelectPrompt(prompt)}
                              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-slate-700
                                       hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600
                                       transition-colors group cursor-pointer"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => handleToggleFavorite(e, prompt.id)}
                                      className={`flex-shrink-0 ${
                                        prompt.is_favorite
                                          ? 'text-yellow-500'
                                          : 'text-gray-300 dark:text-slate-600 hover:text-yellow-500'
                                      } transition-colors`}
                                      title={prompt.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                      {prompt.is_favorite ? '⭐' : '☆'}
                                    </button>
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                      {prompt.title}
                                    </span>
                                  </div>
                                  {prompt.description && (
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                                      {prompt.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 ml-3 flex items-center space-x-1">
                                  {prompt.usage_count > 0 && (
                                    <span className="text-xs text-gray-400 dark:text-slate-500 mr-2">
                                      {prompt.usage_count}
                                    </span>
                                  )}
                                  {/* Edit button */}
                                  <button
                                    onClick={(e) => handleEditClick(e, prompt)}
                                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 
                                             hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors
                                             opacity-0 group-hover:opacity-100"
                                    title="Edit prompt"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => handleDeleteClick(e, prompt)}
                                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 
                                             hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors
                                             opacity-0 group-hover:opacity-100"
                                    title="Delete prompt"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-b-lg">
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                💡 Tip: Type <code className="px-1 py-0.5 bg-gray-200 dark:bg-slate-700 rounded">/</code> in the chat to quickly search prompts
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PromptModal;
