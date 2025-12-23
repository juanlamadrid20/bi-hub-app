/**
 * Analytics Types
 *
 * Type definitions for analytics dashboard data.
 */

export interface TopPrompt {
  id: number;
  title: string;
  category: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface CategoryUsage {
  category: string;
  prompt_count: number;
  total_usage: number;
}

export interface PromptStats {
  total_prompts: number;
  total_usage: number;
  favorites_count: number;
  top_prompts: TopPrompt[];
  usage_by_category: CategoryUsage[];
  recently_used: TopPrompt[];
  period_days: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  active_users: number;
  recent_conversations: number;
  conversations_by_day: DailyCount[];
  messages_by_day: DailyCount[];
  avg_messages_per_conversation: number;
  period_days: number;
}

export interface TrendingTopic {
  topic: string;
  count: number;
}

export interface ResponseStats {
  period_days: number;
  user_messages: number;
  assistant_messages: number;
  error_count: number;
  error_rate_percent: number;
  total_interactions: number;
}

export interface DashboardData {
  prompt_stats: PromptStats | null;
  conversation_stats: ConversationStats | null;
  trending_topics: TrendingTopic[];
  response_stats: ResponseStats | null;
  generated_at: string;
  error?: string;
}
