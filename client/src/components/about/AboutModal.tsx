/**
 * AboutModal Component
 *
 * Displays information about the Multi-Agent Retail Intelligence platform,
 * including benefits, architecture diagram, and key features.
 */

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">
              Multi-Agent Retail Intelligence
            </h2>
            <p className="text-blue-100 mt-1">
              AI-powered Business Intelligence Platform
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-8">
            {/* Overview */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Overview
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                This platform provides comprehensive fashion retail intelligence with inventory-aligned
                analytics, multi-agent orchestration, and seamless Databricks integration. Ask natural
                language questions and get insights powered by specialized AI agents.
              </p>
            </section>

            {/* Architecture Diagram */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                High-Level Architecture
              </h3>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <img
                  src="/architecture.png"
                  alt="Multi-Agent Retail Intelligence Architecture"
                  className="w-full rounded-lg"
                />
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Key Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                  icon="🤖"
                  title="Multi-Agent Intelligence"
                  description="Specialized agents for customer behavior and inventory optimization work together to provide comprehensive insights."
                />
                <FeatureCard
                  icon="📊"
                  title="Inventory-Aligned Analytics"
                  description="Sales analysis respects real-time inventory constraints, tracking lost sales and revenue impact from stockouts."
                />
                <FeatureCard
                  icon="🎯"
                  title="Natural Language Queries"
                  description="Ask questions in plain English - our Genie agents translate your intent into actionable data insights."
                />
                <FeatureCard
                  icon="⚡"
                  title="Real-Time Processing"
                  description="Powered by Databricks with Delta Lake storage, Unity Catalog governance, and scalable compute."
                />
              </div>
            </section>

            {/* Agent Capabilities */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Agent Capabilities
              </h3>
              <div className="space-y-3">
                <AgentCard
                  name="Customer Behavior Agent"
                  description="Analyzes customer segments, lifetime value, cart abandonment, channel preferences, and purchase patterns."
                  color="blue"
                />
                <AgentCard
                  name="Inventory Operations Agent"
                  description="Monitors inventory health, stockout risk, reorder priorities, and revenue impact across locations."
                  color="green"
                />
                <AgentCard
                  name="Agent Supervisor"
                  description="Orchestrates multi-agent queries, combining insights from multiple domains for cross-functional analysis."
                  color="purple"
                />
              </div>
            </section>

            {/* Data Model */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Data Model
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-3">
                Built on a comprehensive star schema with:
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">6 Dimension Tables</span>
                  <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                    Customers, Products, Locations, Dates, Channels, Time
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <span className="font-semibold text-green-700 dark:text-green-300">6 Fact Tables</span>
                  <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                    Sales, Inventory, Events, Cart Abandonment, Forecasts, Stockouts
                  </p>
                </div>
              </div>
            </section>

            {/* Technologies */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Powered By
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Databricks', 'Delta Lake', 'Unity Catalog', 'Genie Spaces', 'Mosaic AI', 'Lakebase'].map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-slate-900 rounded-b-2xl border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
              Version {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} • Built with Databricks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature card component for displaying key features
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-slate-100">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent card component for displaying agent capabilities
 */
function AgentCard({
  name,
  description,
  color,
}: {
  name: string;
  description: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    purple: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} rounded-r-lg p-4`}>
      <h4 className="font-medium text-gray-900 dark:text-slate-100">{name}</h4>
      <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{description}</p>
    </div>
  );
}

export default AboutModal;
