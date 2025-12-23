/**
 * CategoryChart Component
 *
 * Displays prompt usage by category as a horizontal bar chart.
 */

import type { CategoryUsage } from '../../types/analytics';

interface CategoryChartProps {
  categories: CategoryUsage[];
}

const categoryColors: Record<string, string> = {
  customer: 'bg-blue-500',
  inventory: 'bg-green-500',
  analytics: 'bg-purple-500',
  reporting: 'bg-yellow-500',
  general: 'bg-gray-500',
};

const categoryLabels: Record<string, string> = {
  customer: 'Customer',
  inventory: 'Inventory',
  analytics: 'Analytics',
  reporting: 'Reporting',
  general: 'General',
};

export function CategoryChart({ categories }: CategoryChartProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No category data available
      </div>
    );
  }

  const maxUsage = Math.max(...categories.map(c => c.total_usage), 1);

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const percentage = (category.total_usage / maxUsage) * 100;
        const color = categoryColors[category.category] || categoryColors.general;
        const label = categoryLabels[category.category] || category.category;

        return (
          <div key={category.category}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {category.prompt_count} prompts · {category.total_usage} uses
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`${color} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CategoryChart;
