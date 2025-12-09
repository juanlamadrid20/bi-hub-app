/**
 * ConversationSidebar Component
 *
 * Displays conversation history in a sidebar, grouped by time periods.
 * Allows creating new conversations, selecting existing ones, and deleting conversations.
 */

import { useState } from 'react';
import type { Conversation } from '../../types/chat';

interface ConversationSidebarProps {
  /** Grouped conversations to display */
  groupedConversations: Array<{ label: string; conversations: Conversation[] }>;
  /** Currently active conversation ID */
  activeConversationId: string | null;
  /** Callback when a conversation is selected */
  onSelectConversation: (id: string) => void;
  /** Callback to create a new conversation */
  onCreateConversation: () => void;
  /** Callback to delete a conversation */
  onDeleteConversation: (id: string) => void;
  /** Whether the sidebar is open (for mobile) */
  isOpen?: boolean;
  /** Callback to close sidebar (for mobile) */
  onClose?: () => void;
}

export function ConversationSidebar({
  groupedConversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  isOpen = true,
  onClose,
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search
  const filteredGroups = showSearch && searchQuery
    ? groupedConversations.map((group) => ({
        ...group,
        conversations: group.conversations.filter((conv) =>
          conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.messages.some((msg) =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ),
      })).filter((group) => group.conversations.length > 0)
    : groupedConversations;

  const handleConversationClick = (id: string) => {
    onSelectConversation(id);
    onClose?.();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(id);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-slate-800 dark:bg-slate-900
          border-r border-slate-700 dark:border-slate-700
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header with icons */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            {/* History icon */}
            <button
              onClick={onCreateConversation}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
              title="New conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Search icon */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
              title="Search conversations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        )}

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {showSearch && searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label} className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isHovered = hoveredId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className={`
                        relative px-4 py-2 cursor-pointer
                        transition-colors
                        ${isActive
                          ? 'bg-slate-700 text-slate-100'
                          : 'text-slate-300 hover:bg-slate-700/50'
                        }
                      `}
                      onClick={() => handleConversationClick(conv.id)}
                      onMouseEnter={() => setHoveredId(conv.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1 line-clamp-2 break-words">
                          {conv.title}
                        </p>
                        {(isHovered || isActive) && (
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="flex-shrink-0 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
                            title="Delete conversation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default ConversationSidebar;




