/**
 * useChat Hook
 *
 * Manages chat state including streaming messages, tool calls, and responses.
 */

import { useState, useCallback, useRef } from 'react';
import { chatApi } from '../services/chatApi';
import type {
  Message,
  SSEEvent,
  StreamingMessage,
  ToolCall,
  ToolResult,
} from '../types/chat';

interface UseChatOptions {
  onError?: (error: Error) => void;
  onThreadCreated?: (threadId: string) => void;
  threadId?: string | null;
}

interface UseChatReturn {
  /** All messages in the conversation */
  messages: Message[];
  /** Message currently being streamed */
  streamingMessage: StreamingMessage | null;
  /** Whether a message is being sent/streamed */
  isLoading: boolean;
  /** Current error if any */
  error: string | null;
  /** Send a message and stream the response */
  sendMessage: (message: string) => Promise<void>;
  /** Cancel the current streaming response */
  cancelStream: () => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Load messages from a conversation */
  loadMessages: (messages: Message[]) => void;
  /** Clear error state */
  clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onError, onThreadCreated, threadId } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController for canceling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Build history for API request
   */
  const buildHistory = useCallback(() => {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }, [messages]);

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        return;
      }

      setIsLoading(true);
      setError(null);

      // Add user message immediately
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Initialize streaming message
      const streamingId = `streaming-${Date.now()}`;
      setStreamingMessage({
        id: streamingId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolCalls: [],
        toolResults: [],
      });

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        let accumulatedContent = '';
        const toolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        await chatApi.sendMessageStream(
          {
            message,
            history: buildHistory(),
          },
          (event: SSEEvent) => {
            switch (event.type) {
              case 'thread':
                // Backend created/identified a conversation thread
                onThreadCreated?.(event.thread_id);
                break;

              case 'text':
                accumulatedContent += event.content;
                setStreamingMessage((prev) =>
                  prev ? { ...prev, content: accumulatedContent } : null
                );
                break;

              case 'tool_start':
                toolCalls.push({
                  id: event.tool.id,
                  name: event.tool.name,
                  arguments: event.arguments || '',
                });
                setStreamingMessage((prev) =>
                  prev ? { ...prev, toolCalls: [...toolCalls] } : null
                );
                break;

              case 'tool_result':
                toolResults.push({
                  tool_call_id: event.tool_call_id,
                  tool_name: event.tool_name,
                  result: event.result,
                  is_error: event.is_error,
                });
                setStreamingMessage((prev) =>
                  prev ? { ...prev, toolResults: [...toolResults] } : null
                );
                break;

              case 'done':
                // Finalize the streaming message
                setStreamingMessage((prev) =>
                  prev ? { ...prev, isStreaming: false } : null
                );
                break;

              case 'error':
                setError(event.error);
                onError?.(new Error(event.error));
                break;
            }
          },
          abortControllerRef.current.signal,
          threadId || undefined
        );

        // After streaming completes, add assistant message to history
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: accumulatedContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Stream was cancelled, not an error
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
        setStreamingMessage(null);
        abortControllerRef.current = null;
      }
    },
    [buildHistory, onError]
  );

  /**
   * Cancel the current streaming response
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingMessage(null);
    setIsLoading(false);
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingMessage(null);
    setError(null);
  }, []);

  /**
   * Load messages from a conversation
   */
  const loadMessages = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
    setStreamingMessage(null);
    setError(null);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    streamingMessage,
    isLoading,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
    loadMessages,
    clearError,
  };
}

export default useChat;
