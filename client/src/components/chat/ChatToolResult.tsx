/**
 * ChatToolResult Component
 *
 * Displays tool execution results with collapsible details including input and output.
 */

import { useState } from 'react';
import type { ToolResult, ToolCall } from '../../types/chat';

interface ChatToolResultProps {
  result: ToolResult;
  toolCall?: ToolCall;
}

export function ChatToolResult({ result, toolCall }: ChatToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const resultStr =
    typeof result.result === 'string'
      ? result.result
      : JSON.stringify(result.result, null, 2);

  // Format input arguments
  let formattedInput = '';
  if (toolCall?.arguments) {
    try {
      // Try to parse as JSON for pretty formatting
      const parsed = JSON.parse(toolCall.arguments);
      formattedInput = JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, use as-is
      formattedInput = toolCall.arguments;
    }
  }

  // Truncate for preview
  const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;

  return (
    <div
      className={`
        rounded-lg border text-xs
        ${
          result.is_error
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }
      `}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center space-x-2">
          {result.is_error ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span
            className={`font-medium ${
              result.is_error
                ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
            }`}
          >
            {result.tool_name}
          </span>
        </div>

        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Input section */}
          {formattedInput && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Input
              </div>
              <pre className="bg-white dark:bg-slate-800 rounded p-3 overflow-x-auto text-gray-700 dark:text-slate-300 leading-relaxed text-xs border border-gray-200 dark:border-slate-700">
                {formattedInput}
              </pre>
            </div>
          )}

          {/* Output section */}
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 uppercase tracking-wide flex items-center space-x-2">
              <span>Output</span>
              {!result.is_error && (
                <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Completed</span>
                </span>
              )}
            </div>
            <pre className="bg-white dark:bg-slate-800 rounded p-3 overflow-x-auto text-gray-700 dark:text-slate-300 leading-relaxed text-xs border border-gray-200 dark:border-slate-700">
              {resultStr}
            </pre>
          </div>
        </div>
      )}

      {!isExpanded && resultStr.length > 200 && (
        <div className="px-4 pb-3 text-gray-500 dark:text-slate-400 truncate">
          {preview}
        </div>
      )}
    </div>
  );
}

export default ChatToolResult;
