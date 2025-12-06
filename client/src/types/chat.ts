/**
 * Chat API Types
 *
 * TypeScript types for chat functionality matching backend Pydantic models.
 */

// ==================== Core Types ====================

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  tool_call_id: string;
  tool_name: string;
  result: unknown;
  is_error: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string;
}

// ==================== Request Types ====================

export interface SendMessageRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

// ==================== Response Types ====================

export interface StarterMessage {
  label: string;
  message: string;
  icon?: string;
}

export interface StartersResponse {
  starters: StarterMessage[];
  total: number;
}

// ==================== SSE Event Types ====================

export interface SSETextEvent {
  type: 'text';
  content: string;
}

export interface SSEToolStartEvent {
  type: 'tool_start';
  tool: {
    id: string;
    name: string;
  };
  arguments?: string;
}

export interface SSEToolResultEvent {
  type: 'tool_result';
  tool_call_id: string;
  tool_name: string;
  result: unknown;
  is_error: boolean;
}

export interface SSEDoneEvent {
  type: 'done';
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
}

export interface SSEThreadEvent {
  type: 'thread';
  thread_id: string;
}

export type SSEEvent =
  | SSETextEvent
  | SSEToolStartEvent
  | SSEToolResultEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEThreadEvent;

// ==================== UI State Types ====================

export interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

export interface ChatState {
  messages: Message[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  error: string | null;
}

// ==================== Conversation Types ====================

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}
