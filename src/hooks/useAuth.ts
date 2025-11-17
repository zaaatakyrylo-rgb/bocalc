'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { apiClient } from '@/lib/api-client';
import { STORAGE_KEYS } from '@/lib/constants';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Authentication store using Zustand
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.auth.login(email, password);

          if (response.success && response.data) {
            const { user, tokens } = response.data;

            // Store tokens
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

            set({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              error: response.error?.message || 'Login failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.auth.register(email, password);

          if (response.success && response.data) {
            const { user, tokens } = response.data;

            // Store tokens
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

            set({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              error: response.error?.message || 'Registration failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await apiClient.auth.logout();
        } catch (error) {
          // Ignore logout errors
        }

        // Clear tokens
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshToken: async () => {
        try {
          const response = await apiClient.auth.refresh();

          if (response.success && response.data) {
            const { tokens } = response.data;

            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken);
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

            set({ tokens });

            return true;
          }

          return false;
        } catch (error) {
          return false;
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook for authentication
 */
export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    tokens: store.tokens,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshToken: store.refreshToken,
    setUser: store.setUser,
    clearError: store.clearError,
    isAdmin: store.user?.role === 'admin',
    isVendor: store.user?.role === 'vendor',
    isViewer: store.user?.role === 'viewer',
  };
}


