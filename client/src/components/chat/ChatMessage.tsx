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
          max-w-[85%] rounded-2xl px-6 py-5
          ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700'
          }
        `}
      >
        {/* Tool calls - only show those that don't have results yet (still running) */}
        {message.toolCalls && message.toolCalls.length > 0 && (() => {
          // Filter out tool calls that have completed results
          const runningToolCalls = message.toolCalls.filter((toolCall) => {
            if (!message.toolResults || message.toolResults.length === 0) {
              return true; // No results yet, show as running
            }
            // Check if this tool call has a corresponding result
            // Use string comparison and trim to handle any whitespace issues
            const hasResult = message.toolResults.some((result) => {
              const callId = String(toolCall.id || '').trim();
              const resultCallId = String(result.tool_call_id || '').trim();
              return callId === resultCallId && callId !== '';
            });
            return !hasResult; // Only show if no result exists
          });

          // Only render if there are any running tool calls
          if (runningToolCalls.length === 0) {
            return null;
          }

          return (
            <div className="mb-5 space-y-3">
              {runningToolCalls.map((toolCall) => (
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
          );
        })()}

        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mb-5 space-y-3">
            {message.toolResults.map((result) => {
              // Find the corresponding tool call by matching tool_call_id with tool call id
              // Use robust string comparison
              const correspondingToolCall = message.toolCalls?.find((call) => {
                const callId = String(call.id || '').trim();
                const resultCallId = String(result.tool_call_id || '').trim();
                return callId === resultCallId && callId !== '';
              });
              return (
                <ChatToolResult
                  key={result.tool_call_id}
                  result={result}
                  toolCall={correspondingToolCall}
                />
              );
            })}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div
            className={`
              prose prose-base max-w-none
              ${isUser ? 'prose-invert' : 'dark:prose-invert'}
            `}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings with better spacing
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0 leading-tight">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold mt-7 mb-3 first:mt-0 leading-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold mt-6 mb-2.5 first:mt-0 leading-tight">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold mt-5 mb-2 first:mt-0 leading-tight">
                    {children}
                  </h4>
                ),
                // Paragraphs with better spacing
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed last:mb-0">
                    {children}
                  </p>
                ),
                // Lists with better spacing
                ul: ({ children }) => (
                  <ul className="mb-4 ml-6 space-y-2 list-disc last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 ml-6 space-y-2 list-decimal last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">
                    {children}
                  </li>
                ),
                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 dark:border-slate-600 pl-4 my-5 italic text-gray-700 dark:text-slate-300">
                    {children}
                  </blockquote>
                ),
                // Horizontal rules
                hr: () => (
                  <hr className="my-6 border-gray-300 dark:border-slate-600" />
                ),
                // Custom table styling with better spacing
                table: ({ children }) => (
                  <div className="overflow-x-auto my-5">
                    <table className="min-w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-slate-600 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-slate-600 px-4 py-2.5">
                    {children}
                  </td>
                ),
                // Custom code styling
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-sm font-mono"
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
                  <pre className="bg-gray-900 dark:bg-slate-950 rounded-lg p-4 my-5 overflow-x-auto text-sm leading-relaxed">
                    {children}
                  </pre>
                ),
                // Strong and emphasis
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900 dark:text-slate-100">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic">
                    {children}
                  </em>
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
