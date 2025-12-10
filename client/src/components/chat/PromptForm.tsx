/**
 * PromptForm Component
 *
 * Form for creating and editing prompts.
 */

import { useState, useEffect } from 'react';
import type { Prompt, PromptCategory, PromptCreateRequest, PromptUpdateRequest } from '../../types/prompt';
import { PROMPT_CATEGORIES } from '../../types/prompt';

interface PromptFormProps {
  /** Prompt to edit (null for create mode) */
  prompt: Prompt | null;
  /** Callback to close the form */
  onClose: () => void;
  /** Callback when save succeeds */
  onSave: (data: PromptCreateRequest | PromptUpdateRequest, id?: number) => Promise<void>;
  /** Whether a save is in progress */
  isSaving?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function PromptForm({
  prompt,
  onClose,
  onSave,
  isSaving = false,
  error,
}: PromptFormProps) {
  const isEditing = prompt !== null;

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as PromptCategory,
    description: '',
    is_favorite: false,
  });

  // Populate form with existing data when editing
  useEffect(() => {
    if (prompt) {
      setFormData({
        title: prompt.title,
        content: prompt.content,
        category: prompt.category,
        description: prompt.description || '',
        is_favorite: prompt.is_favorite,
      });
    }
  }, [prompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      description: formData.description.trim() || undefined,
      is_favorite: formData.is_favorite,
    };

    await onSave(data, prompt?.id);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Prompt' : 'Create New Prompt'}
        </h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="e.g., inventory_health"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Used for slash commands (e.g., /inventory_health)
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as PromptCategory }))}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {PROMPT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Prompt Content <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
            required
            disabled={isSaving}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-mono text-sm"
            placeholder="Enter the prompt text that will be inserted..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            disabled={isSaving}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Optional description shown in the prompt list..."
          />
        </div>

        {/* Favorite Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_favorite"
            checked={formData.is_favorite}
            onChange={(e) => setFormData((prev) => ({ ...prev, is_favorite: e.target.checked }))}
            disabled={isSaving}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="is_favorite" className="ml-2 block text-sm text-gray-900 dark:text-white">
            Mark as Favorite
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 
                     rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !formData.title.trim() || !formData.content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Prompt'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PromptForm;
