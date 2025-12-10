/**
 * Prompt API Service
 *
 * Functions for interacting with the prompt management API endpoints.
 */

import type {
  Prompt,
  PromptCreateRequest,
  PromptUpdateRequest,
  PromptListResponse,
  PromptUsageResponse,
} from '../types/prompt';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = `${API_BASE_URL}/prompts`;

// ==================== Error Handling ====================

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ==================== Prompt API Functions ====================

/**
 * List all prompts with optional filtering
 */
export async function listPrompts(params?: {
  category?: string;
  favorites_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PromptListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set('category', params.category);
  if (params?.favorites_only) queryParams.set('favorites_only', 'true');
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());

  const url = queryParams.toString() ? `${API_BASE}?${queryParams}` : API_BASE;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<PromptListResponse>(response);
}

/**
 * Create a new prompt
 */
export async function createPrompt(data: PromptCreateRequest): Promise<Prompt> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<Prompt>(response);
}

/**
 * Get a specific prompt by ID
 */
export async function getPrompt(id: number): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<Prompt>(response);
}

/**
 * Get a prompt by title (for slash command support)
 */
export async function getPromptByTitle(title: string): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/by-title/${encodeURIComponent(title)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<Prompt>(response);
}

/**
 * Update a prompt
 */
export async function updatePrompt(id: number, data: PromptUpdateRequest): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<Prompt>(response);
}

/**
 * Delete a prompt
 */
export async function deletePrompt(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
  }
}

/**
 * Increment usage count for a prompt
 */
export async function incrementUsage(id: number): Promise<PromptUsageResponse> {
  const response = await fetch(`${API_BASE}/${id}/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<PromptUsageResponse>(response);
}

/**
 * Toggle favorite status of a prompt
 */
export async function toggleFavorite(id: number): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/${id}/toggle-favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<Prompt>(response);
}

// ==================== Export ====================

export const promptApi = {
  listPrompts,
  createPrompt,
  getPrompt,
  getPromptByTitle,
  updatePrompt,
  deletePrompt,
  incrementUsage,
  toggleFavorite,
};

export default promptApi;
