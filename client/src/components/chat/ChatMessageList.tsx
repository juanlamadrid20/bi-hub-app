/**
 * ChatMessageList Component
 *
 * Scrollable list of chat messages with auto-scroll.
 */

import { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import type { Message, StreamingMessage } from '../../types/chat';

interface ChatMessageListProps {
  messages: Message[];
  streamingMessage: StreamingMessage | null;
}

export function ChatMessageList({ messages, streamingMessage }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage?.content]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-6"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {streamingMessage && (
          <ChatMessage
            message={{
              id: streamingMessage.id,
              role: streamingMessage.role,
              content: streamingMessage.content,
              toolCalls: streamingMessage.toolCalls,
              toolResults: streamingMessage.toolResults,
              timestamp: new Date().toISOString(),
            }}
            isStreaming={streamingMessage.isStreaming}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ChatMessageList;
