/**
 * Analytics Dashboard Component
 *
 * Displays usage statistics, trending topics, and response metrics.
 */

import { useState, useEffect } from 'react';
import { fetchDashboard } from '../../services/analyticsApi';
import type { DashboardData } from '../../types/analytics';
import { StatCard } from './StatCard';
import { TopPromptsTable } from './TopPromptsTable';
import { CategoryChart } from './CategoryChart';
import { TrendingTopics } from './TrendingTopics';
import { ActivityChart } from './ActivityChart';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await fetchDashboard(period);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const promptStats = data.prompt_stats;
  const convStats = data.conversation_stats;
  const responseStats = data.response_stats;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Usage statistics and insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Conversations"
            value={convStats?.total_conversations ?? 0}
            subtitle={`${convStats?.recent_conversations ?? 0} in last ${period} days`}
            icon="💬"
          />
          <StatCard
            title="Total Messages"
            value={convStats?.total_messages ?? 0}
            subtitle={`Avg ${convStats?.avg_messages_per_conversation ?? 0} per conversation`}
            icon="📝"
          />
          <StatCard
            title="Prompt Library"
            value={promptStats?.total_prompts ?? 0}
            subtitle={`${promptStats?.total_usage ?? 0} total uses`}
            icon="📚"
          />
          <StatCard
            title="Success Rate"
            value={`${100 - (responseStats?.error_rate_percent ?? 0)}%`}
            subtitle={`${responseStats?.error_count ?? 0} errors`}
            icon="✅"
            valueColor={responseStats?.error_rate_percent && responseStats.error_rate_percent > 5 ? 'text-red-500' : 'text-green-500'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity Over Time
            </h2>
            <ActivityChart
              conversationsByDay={convStats?.conversations_by_day ?? []}
              messagesByDay={convStats?.messages_by_day ?? []}
            />
          </div>

          {/* Category Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Prompts by Category
            </h2>
            <CategoryChart categories={promptStats?.usage_by_category ?? []} />
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Prompts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Prompts
            </h2>
            <TopPromptsTable prompts={promptStats?.top_prompts ?? []} />
          </div>

          {/* Trending Topics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Trending Topics
            </h2>
            <TrendingTopics topics={data.trending_topics} />
          </div>
        </div>

        {/* Footer with timestamp */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date(data.generated_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
