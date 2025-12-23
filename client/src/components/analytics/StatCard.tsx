/**
 * StatCard Component
 *
 * Displays a single statistic with title, value, and optional subtitle.
 */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  valueColor?: string;
}

export function StatCard({ title, value, subtitle, icon, valueColor = 'text-gray-900 dark:text-white' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${valueColor}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <span className="text-3xl" role="img" aria-label={title}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
