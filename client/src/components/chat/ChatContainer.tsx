/**
 * ChatContainer Component
 *
 * Main chat interface wrapper that:
 * - Manages chat state via useChat hook
 * - Manages conversation history via useConversations hook
 * - Displays conversation sidebar
 * - Displays starter messages on empty state
 * - Contains message list and input
 */

import { useEffect, useCallback, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useConversations } from '../../hooks/useConversations';
import { chatApi } from '../../services/chatApi';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import { ConversationSidebar } from './ConversationSidebar';
import type { StarterMessage, Message } from '../../types/chat';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className = '' }: ChatContainerProps) {
  const [starters, setStarters] = useState<StarterMessage[]>([]);
  const [startersLoading, setStartersLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    groupedConversations,
    activeConversationId,
    loadConversation,
    deleteConversation,
    setActiveConversationId,
    refreshConversations,
  } = useConversations();

  const {
    messages,
    streamingMessage,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadMessages,
    clearError,
  } = useChat({
    onError: (err) => {
      console.error('Chat error:', err);
    },
    onThreadCreated: (threadId) => {
      // Backend created a new thread - update our active conversation ID
      setActiveConversationId(threadId);
    },
    threadId: activeConversationId,
  });

  // Load conversation messages when active conversation changes
  useEffect(() => {
    const loadActiveConversation = async () => {
      if (activeConversationId) {
        try {
          const conversation = await loadConversation(activeConversationId);
          if (conversation && conversation.messages && conversation.messages.length > 0) {
            loadMessages(conversation.messages);
          } else {
            clearMessages();
          }
        } catch (err) {
          console.error('Failed to load conversation:', err);
          clearMessages();
        }
      } else {
        clearMessages();
      }
    };
    loadActiveConversation();
  }, [activeConversationId]); // Remove other deps to avoid infinite loops

  // Refresh conversation list when messages change to pick up new conversations
  // created by the backend or updated titles
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to let backend finish processing
      const timeout = setTimeout(() => {
        refreshConversations().catch(err => {
          console.error('Failed to refresh conversations:', err);
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [messages.length]); // Only trigger on message count change

  // Fetch starter messages on mount
  useEffect(() => {
    const fetchStarters = async () => {
      setStartersLoading(true);
      try {
        const response = await chatApi.getStarters();
        setStarters(response.starters);
      } catch (err) {
        console.error('Failed to fetch starters:', err);
      } finally {
        setStartersLoading(false);
      }
    };
    fetchStarters();
  }, []);

  /**
   * Handle sending a message
   * Note: Conversation creation is handled by the backend
   */
  const handleSend = useCallback(
    async (message: string) => {
      try {
        await sendMessage(message);
        // Refresh conversations to pick up any new ones created by backend
        await refreshConversations();
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [sendMessage, refreshConversations]
  );

  /**
   * Handle starter message selection
   */
  const handleStarterClick = useCallback(
    (starter: StarterMessage) => {
      handleSend(starter.message);
    },
    [handleSend]
  );

  /**
   * Handle creating a new conversation
   * Just clears the current chat - backend will create conversation on first message
   */
  const handleNewConversation = useCallback(() => {
    clearMessages();
    setActiveConversationId(null);
  }, [clearMessages, setActiveConversationId]);

  /**
   * Handle selecting a conversation
   */
  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      // Messages will be loaded by the useEffect hook
    },
    [setActiveConversationId]
  );

  /**
   * Handle deleting a conversation
   */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        if (activeConversationId === id) {
          clearMessages();
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [deleteConversation, activeConversationId, clearMessages]
  );

  const hasMessages = messages.length > 0 || streamingMessage !== null;

  return (
    <div className={`flex h-full bg-gray-50 dark:bg-slate-900 ${className}`}>
      {/* Sidebar */}
      <ConversationSidebar
        groupedConversations={groupedConversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-slate-100">
                BI Hub Assistant
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Powered by Mosaic AI
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {hasMessages && (
              <button
                onClick={handleNewConversation}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="New chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center justify-between">
          <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Messages or empty state */}
      {!hasMessages ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              Welcome to BI Hub
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-8 max-w-md">
              Ask me about customer behavior, inventory operations, voice of customer insights,
              or cross-domain analytics.
            </p>

            {/* Starter Messages */}
            {startersLoading ? (
              <div className="text-gray-400 dark:text-slate-500 text-sm">
                Loading suggestions...
              </div>
            ) : starters.length > 0 ? (
              <div className="w-full max-w-2xl">
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                  Try asking:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {starters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => handleStarterClick(starter)}
                      disabled={isLoading}
                      className="
                        px-4 py-3 text-sm text-left
                        bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg
                        text-gray-700 dark:text-slate-300
                        hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        group
                      "
                    >
                      <span className="font-medium text-gray-900 dark:text-slate-100 block mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {starter.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                        {starter.message}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <ChatMessageList messages={messages} streamingMessage={streamingMessage} />
      )}

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} disabled={false} />
      </div>
    </div>
  );
}

export default ChatContainer;
