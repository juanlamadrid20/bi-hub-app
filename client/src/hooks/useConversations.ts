/**
 * useConversations Hook
 *
 * Manages conversation history with Lakebase database via API.
 * Groups conversations by time periods (Today, Previous 7 days, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '../services/chatApi';
import type { Conversation, ConversationGroup, Message } from '../types/chat';

interface UseConversationsReturn {
  /** All conversations */
  conversations: Conversation[];
  /** Conversations grouped by time period */
  groupedConversations: ConversationGroup[];
  /** Currently active conversation ID */
  activeConversationId: string | null;
  /** Create a new conversation */
  createConversation: () => Promise<string>;
  /** Load a conversation by ID */
  loadConversation: (id: string) => Promise<Conversation | null>;
  /** Update the current conversation with new messages */
  updateConversation: (messages: Message[]) => Promise<void>;
  /** Delete a conversation */
  deleteConversation: (id: string) => Promise<void>;
  /** Set the active conversation */
  setActiveConversationId: (id: string | null) => void;
  /** Get conversation title from first message */
  generateTitle: (firstMessage: string) => string;
  /** Refresh conversations from server */
  refreshConversations: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Generate a conversation title from the first message
 */
function generateTitleFromMessage(message: string): string {
  // Truncate to 50 characters and clean up
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 50) {
    return cleaned;
  }
  return cleaned.substring(0, 47) + '...';
}

/**
 * Group conversations by time period
 */
function groupConversations(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: ConversationGroup[] = [];
  const todayConvs: Conversation[] = [];
  const weekConvs: Conversation[] = [];
  const olderConvs: Conversation[] = [];

  conversations.forEach((conv) => {
    const updatedAt = new Date(conv.updatedAt);
    if (updatedAt >= today) {
      todayConvs.push(conv);
    } else if (updatedAt >= sevenDaysAgo) {
      weekConvs.push(conv);
    } else {
      olderConvs.push(conv);
    }
  });

  // Sort each group by updatedAt (newest first)
  const sortByDate = (a: Conversation, b: Conversation) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  if (todayConvs.length > 0) {
    groups.push({
      label: 'Today',
      conversations: todayConvs.sort(sortByDate),
    });
  }

  if (weekConvs.length > 0) {
    groups.push({
      label: 'Previous 7 days',
      conversations: weekConvs.sort(sortByDate),
    });
  }

  if (olderConvs.length > 0) {
    groups.push({
      label: 'Older',
      conversations: olderConvs.sort(sortByDate),
    });
  }

  return groups;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load conversations from server
   */
  const refreshConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await chatApi.listConversations();
      setConversations(loaded);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Group conversations
  const groupedConversations = groupConversations(conversations);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (): Promise<string> => {
    try {
      const newConv = await chatApi.createConversation();
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      return newConv.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Load a conversation by ID
   */
  const loadConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      try {
        const conv = await chatApi.getConversation(id);
        // Update in local state if it exists
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = conv;
            return updated;
          }
          return [conv, ...prev];
        });
        return conv;
      } catch (err) {
        console.error('Failed to load conversation:', err);
        return null;
      }
    },
    []
  );

  /**
   * Update the current conversation with new messages
   * Note: Messages are automatically saved by the backend when sent
   * This is mainly for updating the local state
   */
  const updateConversation = useCallback(
    async (messages: Message[]) => {
      if (!activeConversationId) {
        return;
      }

      try {
        // Reload conversation to get latest state from server
        const updated = await chatApi.getConversation(activeConversationId);
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === activeConversationId);
          if (index >= 0) {
            const updatedList = [...prev];
            updatedList[index] = updated;
            return updatedList;
          }
          return prev;
        });

        // Update title if it's still default and we have messages
        if (updated.title === 'New conversation' && messages.length > 0) {
          const firstUserMessage = messages.find((m) => m.role === 'user');
          if (firstUserMessage) {
            const title = generateTitleFromMessage(firstUserMessage.content);
            await chatApi.updateConversation(activeConversationId, title);
            // Refresh to get updated title
            await refreshConversations();
          }
        }
      } catch (err) {
        console.error('Failed to update conversation:', err);
      }
    },
    [activeConversationId, refreshConversations]
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      // Clear active conversation if it was deleted
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      throw err;
    }
  }, [activeConversationId]);

  /**
   * Generate a title from a message
   */
  const generateTitle = useCallback((message: string): string => {
    return generateTitleFromMessage(message);
  }, []);

  return {
    conversations,
    groupedConversations,
    activeConversationId,
    createConversation,
    loadConversation,
    updateConversation,
    deleteConversation,
    setActiveConversationId,
    generateTitle,
    refreshConversations,
    isLoading,
    error,
  };
}

export default useConversations;




