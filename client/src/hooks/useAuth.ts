/**
 * useAuth Hook
 *
 * Manages authentication state and provides user info and logout capability.
 */

import { useState, useEffect, useCallback } from 'react';
import { authApi, type AuthStatus, type AuthUser } from '../services/authApi';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logoutUrl: string | null;
  logout: () => void;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuthStatus = useCallback(async () => {
    try {
      const authStatus = await authApi.getAuthStatus();
      setStatus(authStatus);
    } catch (err) {
      console.error('Failed to fetch auth status:', err);
      setStatus({
        authenticated: false,
        user: null,
        logout_url: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

  const logout = useCallback(() => {
    if (status?.logout_url) {
      window.location.href = status.logout_url;
    }
  }, [status?.logout_url]);

  return {
    user: status?.user ?? null,
    isAuthenticated: status?.authenticated ?? false,
    isLoading,
    logoutUrl: status?.logout_url ?? null,
    logout,
    refresh: fetchAuthStatus,
  };
}

export default useAuth;
