/**
 * ChatInput Component
 *
 * Message input with send button, keyboard handling, and slash command support.
 * Features:
 * - Auto-resize textarea
 * - Send on Enter (Shift+Enter for newline)
 * - Slash command `/` autocomplete for prompts
 * - Prompt browser button
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { promptApi } from '../../services/promptApi';
import type { Prompt } from '../../types/prompt';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask about your portfolio...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash command suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Prompt[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Detect slash commands
  useEffect(() => {
    const cursorPosition = textareaRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.slice(0, cursorPosition);

    // Find the last `/` that might be starting a slash command
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Check if there's no space between / and cursor (active command)
      const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1);

      // Only trigger if / is at start or preceded by space/newline, and no space after /
      const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : ' ';
      const isValidSlashStart = charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlashIndex === 0;

      if (isValidSlashStart && !textAfterSlash.includes(' ')) {
        const query = textAfterSlash.toLowerCase();
        setSlashStartIndex(lastSlashIndex);

        // Fetch matching prompts
        promptApi.listPrompts().then((response) => {
          const matches = query
            ? response.prompts.filter((p) => 
                p.title.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
              ).slice(0, 8)
            : response.prompts.slice(0, 8);
          setSuggestions(matches);
          setShowSuggestions(matches.length > 0);
          setSelectedIndex(0);
        }).catch(() => {
          setShowSuggestions(false);
        });
        return;
      }
    }

    // No active slash command
    setShowSuggestions(false);
    setSlashStartIndex(null);
  }, [input]);

  const handleSubmit = useCallback(() => {
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput('');
      setShowSuggestions(false);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, isLoading, disabled, onSend]);

  // Handle slash command selection
  const handleSelectPrompt = useCallback((prompt: Prompt) => {
    if (slashStartIndex === null) {
      // Fallback: replace entire message
      setInput(prompt.content);
    } else {
      // Insert prompt content at the slash position
      const cursorPosition = textareaRef.current?.selectionStart ?? input.length;
      const beforeSlash = input.slice(0, slashStartIndex);
      const afterCursor = input.slice(cursorPosition);

      // Replace the /command with the prompt content
      const newMessage = beforeSlash + prompt.content + (afterCursor ? ' ' + afterCursor : '');
      setInput(newMessage);

      // Set cursor position after the inserted content
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeSlash.length + prompt.content.length + (afterCursor ? 1 : 0);
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }

    setShowSuggestions(false);
    setSlashStartIndex(null);
    
    // Increment usage (fire and forget)
    promptApi.incrementUsage(prompt.id).catch(() => {});
    
    // Focus back on textarea
    textareaRef.current?.focus();
  }, [input, slashStartIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((i) => (i > 0 ? i - 1 : i));
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSelectPrompt(suggestions[selectedIndex]);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleSelectPrompt(suggestions[selectedIndex]);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
        }
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectPrompt, handleSubmit]
  );

  const canSend = input.trim().length > 0 && !isLoading && !disabled;
  const isDisabled = isLoading || disabled;

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          {/* Slash command suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-10">
              {/* Header */}
              <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  PROMPTS
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-500">
                  {suggestions.length} matches
                </span>
              </div>
              {/* List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectPrompt(suggestion)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-slate-700'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500 dark:text-blue-400 text-sm">/</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {suggestion.title}
                      </span>
                      {suggestion.is_favorite && (
                        <span className="text-yellow-500 text-xs">⭐</span>
                      )}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 pl-5 line-clamp-1">
                        {suggestion.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className="
              w-full px-4 py-3
              bg-gray-50 dark:bg-slate-900
              border border-gray-200 dark:border-slate-600
              rounded-xl
              text-gray-900 dark:text-slate-100
              placeholder-gray-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none overflow-hidden
              transition-all duration-200
            "
          />
        </div>

{/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className={`
            px-4 py-3 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${
              canSend
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
            }
          `}
          title="Send Message"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-2">
        <span>Enter</span> send
        <span className="mx-2">|</span>
        <span>Shift+Enter</span> newline
        <span className="mx-2">|</span>
        <span className="text-blue-500 dark:text-blue-400">/</span> prompts
      </p>
    </div>
  );
}

export default ChatInput;
