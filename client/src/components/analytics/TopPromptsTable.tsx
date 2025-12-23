/**
 * TopPromptsTable Component
 *
 * Displays a table of most-used prompts.
 */

import type { TopPrompt } from '../../types/analytics';

interface TopPromptsTableProps {
  prompts: TopPrompt[];
}

const categoryColors: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  inventory: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  analytics: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reporting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export function TopPromptsTable({ prompts }: TopPromptsTableProps) {
  if (prompts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No prompt usage data yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-3 font-medium">Prompt</th>
            <th className="pb-3 font-medium">Category</th>
            <th className="pb-3 font-medium text-right">Uses</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {prompts.map((prompt, index) => (
            <tr key={prompt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-5">{index + 1}.</span>
                  <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                    {prompt.title}
                  </span>
                </div>
              </td>
              <td className="py-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[prompt.category] || categoryColors.general}`}>
                  {prompt.category}
                </span>
              </td>
              <td className="py-3 text-right text-gray-900 dark:text-white font-semibold">
                {prompt.usage_count.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopPromptsTable;
