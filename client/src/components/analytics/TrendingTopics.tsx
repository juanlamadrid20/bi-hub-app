/**
 * TrendingTopics Component
 *
 * Displays trending conversation topics as tags.
 */

import type { TrendingTopic } from '../../types/analytics';

interface TrendingTopicsProps {
  topics: TrendingTopic[];
}

export function TrendingTopics({ topics }: TrendingTopicsProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No trending topics yet</p>
        <p className="text-sm mt-1">Topics are extracted from conversation titles</p>
      </div>
    );
  }

  const maxCount = Math.max(...topics.map(t => t.count), 1);

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => {
        const intensity = Math.min((topic.count / maxCount) * 100, 100);
        const isHot = intensity > 70;
        const isMedium = intensity > 40 && intensity <= 70;

        return (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg">
                {isHot ? '🔥' : isMedium ? '📈' : '💡'}
              </span>
              <span className="text-gray-900 dark:text-white font-medium truncate">
                {topic.topic}
              </span>
            </div>
            <span className={`
              px-2 py-1 text-xs font-semibold rounded-full shrink-0
              ${isHot
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : isMedium
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }
            `}>
              {topic.count} {topic.count === 1 ? 'conversation' : 'conversations'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default TrendingTopics;
