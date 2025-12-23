/**
 * ActivityChart Component
 *
 * Displays activity over time as a simple bar chart.
 */

import type { DailyCount } from '../../types/analytics';

interface ActivityChartProps {
  conversationsByDay: DailyCount[];
  messagesByDay: DailyCount[];
}

export function ActivityChart({ conversationsByDay, messagesByDay }: ActivityChartProps) {
  // Combine and sort data by date
  const allDates = new Set([
    ...conversationsByDay.map(d => d.date),
    ...messagesByDay.map(d => d.date)
  ]);

  if (allDates.size === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No activity data available
      </div>
    );
  }

  const sortedDates = Array.from(allDates).sort();
  const convMap = new Map(conversationsByDay.map(d => [d.date, d.count]));
  const msgMap = new Map(messagesByDay.map(d => [d.date, d.count]));

  const chartData = sortedDates.map(date => ({
    date,
    conversations: convMap.get(date) || 0,
    messages: msgMap.get(date) || 0,
  }));

  const maxMessages = Math.max(...chartData.map(d => d.messages), 1);
  const maxConversations = Math.max(...chartData.map(d => d.conversations), 1);

  // Take last 14 days max for display
  const displayData = chartData.slice(-14);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-gray-600 dark:text-gray-400">Conversations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Messages</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1 h-40">
        {displayData.map((day, index) => {
          const convHeight = (day.conversations / maxConversations) * 100;
          const msgHeight = (day.messages / maxMessages) * 100;
          const dateObj = new Date(day.date);
          const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center group">
              <div className="w-full flex gap-0.5 items-end h-32">
                {/* Conversations bar */}
                <div
                  className="flex-1 bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                  style={{ height: `${Math.max(convHeight, 4)}%` }}
                  title={`${day.conversations} conversations`}
                />
                {/* Messages bar */}
                <div
                  className="flex-1 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${Math.max(msgHeight, 4)}%` }}
                  title={`${day.messages} messages`}
                />
              </div>
              {/* Date label - show every other day if many days */}
              {(displayData.length <= 7 || index % 2 === 0) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                  {dateLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {chartData.reduce((sum, d) => sum + d.conversations, 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Conversations</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {chartData.reduce((sum, d) => sum + d.messages, 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Messages</p>
        </div>
      </div>
    </div>
  );
}

export default ActivityChart;
