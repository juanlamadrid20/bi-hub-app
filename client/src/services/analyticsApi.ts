/**
 * Analytics API Service
 *
 * Client for analytics dashboard endpoints.
 */

import type { DashboardData, PromptStats, ConversationStats, ResponseStats, TrendingTopic } from '../types/analytics';

const API_BASE = '/api/analytics';

/**
 * Fetch complete dashboard data.
 */
export async function fetchDashboard(days: number = 30): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch prompt usage analytics.
 */
export async function fetchPromptStats(days: number = 30): Promise<PromptStats> {
  const response = await fetch(`${API_BASE}/prompts?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch prompt stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch conversation analytics.
 */
export async function fetchConversationStats(days: number = 30): Promise<ConversationStats> {
  const response = await fetch(`${API_BASE}/conversations?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conversation stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch trending topics.
 */
export async function fetchTrendingTopics(days: number = 7, limit: number = 10): Promise<{ topics: TrendingTopic[]; period_days: number }> {
  const response = await fetch(`${API_BASE}/trending?days=${days}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trending topics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch response statistics.
 */
export async function fetchResponseStats(days: number = 7): Promise<ResponseStats> {
  const response = await fetch(`${API_BASE}/response-stats?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch response stats: ${response.statusText}`);
  }
  return response.json();
}
