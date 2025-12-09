/**
 * Auth API Service
 *
 * Functions for interacting with the auth API endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthUser {
  email: string | null;
  display_name: string | null;
  auth_type: 'obo' | 'pat';
}

export interface AuthStatus {
  authenticated: boolean;
  user: AuthUser | null;
  logout_url: string | null;
}

/**
 * Get the current authentication status
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE_URL}/auth/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return {
      authenticated: false,
      user: null,
      logout_url: null,
    };
  }

  return response.json();
}

/**
 * Get the current user info (requires authentication)
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to get current user');
  }

  return response.json();
}

export const authApi = {
  getAuthStatus,
  getCurrentUser,
};

export default authApi;
