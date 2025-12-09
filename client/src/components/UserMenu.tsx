/**
 * UserMenu Component
 *
 * Displays the current user info with a dropdown menu for logout.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function UserMenu() {
  const { user, isAuthenticated, isLoading, logoutUrl, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get initials from display name or email
  const getInitials = () => {
    if (user.display_name) {
      const parts = user.display_name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return user.display_name.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        title={user.display_name || user.email || 'User'}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          {getInitials()}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              {user.display_name || 'User'}
            </p>
            {user.email && (
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {user.auth_type === 'obo' ? 'Databricks SSO' : 'Local Development'}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {logoutUrl && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
