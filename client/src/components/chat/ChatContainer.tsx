/**
 * ChatContainer Component
 *
 * Main chat interface wrapper that:
 * - Manages chat state via useChat hook
 * - Manages conversation history via useConversations hook
 * - Displays conversation sidebar
 * - Displays starter messages on empty state
 * - Contains message list and input
 * - Manages prompt library modal
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useConversations } from '../../hooks/useConversations';
import { chatApi } from '../../services/chatApi';
import { promptApi } from '../../services/promptApi';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import { ConversationSidebar } from './ConversationSidebar';
import { PromptModal } from './PromptModal';
import { AnalyticsDashboard } from '../analytics';
import { AboutModal } from '../about';
import { UserMenu } from '../UserMenu';
import type { StarterMessage } from '../../types/chat';
import type { Prompt } from '../../types/prompt';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className = '' }: ChatContainerProps) {
  const [starters, setStarters] = useState<StarterMessage[]>([]);
  const [startersLoading, setStartersLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const {
    groupedConversations,
    activeConversationId,
    loadConversation,
    renameConversation,
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

  // Track if we're currently streaming to avoid reloading during stream
  const isStreamingRef = useRef(false);
  
  // Update streaming ref when isLoading changes
  useEffect(() => {
    isStreamingRef.current = isLoading;
  }, [isLoading]);

  // Load conversation messages when active conversation changes
  // BUT skip if we're currently streaming (to avoid clearing streaming state)
  useEffect(() => {
    const loadActiveConversation = async () => {
      // Skip loading if we're currently streaming - don't interrupt the stream
      if (isStreamingRef.current) {
        return;
      }
      
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
   * Handle renaming a conversation
   */
  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await renameConversation(id, title);
      } catch (err) {
        console.error('Failed to rename conversation:', err);
      }
    },
    [renameConversation]
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

  /**
   * Handle prompt selection from modal
   * Sends the prompt content as a message
   */
  const handleSelectPrompt = useCallback(
    (prompt: Prompt) => {
      // Send the prompt content as a message
      handleSend(prompt.content);
      
      // Increment usage (fire and forget)
      promptApi.incrementUsage(prompt.id).catch(() => {});
    },
    [handleSend]
  );

  /**
   * Open the prompt browser modal
   */
  const handleOpenPrompts = useCallback(() => {
    setPromptModalOpen(true);
  }, []);

  const hasMessages = messages.length > 0 || streamingMessage !== null;

  return (
    <div className={`flex h-full bg-gray-50 dark:bg-slate-900 ${className}`}>
      {/* Sidebar */}
      <ConversationSidebar
        groupedConversations={groupedConversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
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

            <button
              onClick={() => setAboutOpen(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              title="About BI Hub"
            >
              <span className="text-white text-lg">🤖</span>
            </button>
            <div>
              <button
                onClick={() => setAboutOpen(true)}
                className="text-left hover:opacity-80 transition-opacity"
              >
                <h1 className="font-semibold text-gray-900 dark:text-slate-100">
                  BI Hub Assistant
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Powered by Mosaic AI ({__APP_VERSION__})
                </p>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Browse prompts button */}
            <button
              onClick={handleOpenPrompts}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Browse prompts"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {/* Analytics button */}
            <button
              onClick={() => setAnalyticsOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Analytics Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
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
            <UserMenu />
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
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={false}
        />
      </div>

      {/* Prompt Browser Modal */}
      <PromptModal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />

      {/* Analytics Dashboard Modal */}
      {analyticsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAnalyticsOpen(false)} />
          <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <AnalyticsDashboard onClose={() => setAnalyticsOpen(false)} />
          </div>
        </div>
      )}

      {/* About Modal */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export default ChatContainer;
