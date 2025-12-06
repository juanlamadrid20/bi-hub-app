/**
 * Chat API Service
 *
 * Functions for interacting with the chat API endpoints.
 * Includes support for SSE streaming responses.
 */

import type {
  SendMessageRequest,
  StartersResponse,
  SSEEvent,
} from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==================== Error Handling ====================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ==================== Starters API ====================

/**
 * Get chat starter messages
 */
export async function getStarters(): Promise<StartersResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/starters`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<StartersResponse>(response);
}

// ==================== Message API ====================

/**
 * Send a message and stream the response via SSE
 *
 * @param request - The message request with optional history
 * @param onEvent - Callback for each SSE event
 * @param signal - Optional AbortSignal to cancel the stream
 */
export async function sendMessageStream(
  request: SendMessageRequest,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as SSEEvent;
            onEvent(data);

            // Stop processing on done or error
            if (data.type === 'done' || data.type === 'error') {
              return;
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', line, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send a message and get a non-streaming response
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<{ content: string; tool_calls?: unknown[] }> {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return handleResponse(response);
}

// ==================== Export ====================

export const chatApi = {
  getStarters,
  sendMessageStream,
  sendMessage,
};

export default chatApi;
