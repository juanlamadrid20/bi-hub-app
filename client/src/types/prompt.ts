/**
 * Prompt Management Types
 *
 * TypeScript types for the prompt library feature.
 */

// Valid categories for prompts
export type PromptCategory =
  | 'customer'
  | 'inventory'
  | 'analytics'
  | 'reporting'
  | 'general';

// Prompt entity
export interface Prompt {
  id: number;
  title: string;
  content: string;
  category: PromptCategory;
  description: string | null;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// Request to create a new prompt
export interface PromptCreateRequest {
  title: string;
  content: string;
  category: PromptCategory;
  description?: string;
  is_favorite?: boolean;
}

// Request to update a prompt
export interface PromptUpdateRequest {
  title?: string;
  content?: string;
  category?: PromptCategory;
  description?: string;
  is_favorite?: boolean;
}

// Response containing list of prompts
export interface PromptListResponse {
  prompts: Prompt[];
  total: number;
}

// Response after incrementing usage
export interface PromptUsageResponse {
  id: number;
  usage_count: number;
  last_used_at: string;
}

// Category display configuration
export interface CategoryConfig {
  value: PromptCategory;
  label: string;
  icon: string;
}

// Category configurations for UI
export const PROMPT_CATEGORIES: CategoryConfig[] = [
  { value: 'customer', label: 'Customer', icon: '👥' },
  { value: 'inventory', label: 'Inventory', icon: '📦' },
  { value: 'analytics', label: 'Analytics', icon: '📊' },
  { value: 'reporting', label: 'Reporting', icon: '📈' },
  { value: 'general', label: 'General', icon: '💬' },
];

// Category label lookup
export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  customer: 'Customer',
  inventory: 'Inventory',
  analytics: 'Analytics',
  reporting: 'Reporting',
  general: 'General',
};

// Category icon lookup
export const CATEGORY_ICONS: Record<PromptCategory, string> = {
  customer: '👥',
  inventory: '📦',
  analytics: '📊',
  reporting: '📈',
  general: '💬',
};
