/**
 * ChatMessage Component
 *
 * Renders a single chat message with support for:
 * - User and assistant messages
 * - Tool calls and results
 * - Markdown formatting
 * - Streaming indicator
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatToolResult from './ChatToolResult';
import type { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700'
          }
        `}
      >
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.toolCalls.map((toolCall) => (
              <div
                key={toolCall.id}
                className="flex items-center space-x-2 text-xs bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2"
              >
                <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="font-medium text-gray-700 dark:text-slate-300">
                  Running: {toolCall.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.toolResults.map((result) => (
              <ChatToolResult key={result.tool_call_id} result={result} />
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div
            className={`
              prose prose-sm max-w-none
              ${isUser ? 'prose-invert' : 'dark:prose-invert'}
            `}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom table styling
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-slate-600 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-slate-600 px-3 py-2">
                    {children}
                  </td>
                ),
                // Custom code styling
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto text-sm">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !message.content && (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Streaming cursor */}
        {isStreaming && message.content && (
          <span className="inline-block w-2 h-4 bg-gray-400 dark:bg-slate-500 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
