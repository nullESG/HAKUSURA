import { create } from 'zustand';
import { GITHUB_OAUTH_CONFIG } from './constants';
import { generateCodeChallenge } from './pkce';
import { GitHubUser } from './api';

interface GitHubAuthState {
  accessToken: string | null;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  setAccessToken: (token: string) => void;
  setUser: (user: GitHubUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  startOAuthFlow: () => Promise<void>;
  loadFromStorage: () => void;
}

export const useGitHubAuthStore = create<GitHubAuthState>((set) => ({
  accessToken: null,
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  setAccessToken: (token) =>
    set(() => ({
      accessToken: token,
      isAuthenticated: !!token,
    })),

  setUser: (user) =>
    set(() => ({
      user,
    })),

  setIsLoading: (loading) =>
    set(() => ({
      isLoading: loading,
    })),

  setError: (error) =>
    set(() => ({
      error,
    })),

  logout: () =>
    set(() => {
      localStorage.removeItem('github_access_token');
      localStorage.removeItem('github_code_verifier');
      sessionStorage.removeItem('github_user');
      return {
        accessToken: null,
        user: null,
        isAuthenticated: false,
        error: null,
      };
    }),

  startOAuthFlow: async () => {
    set({ isLoading: true, error: null });
    try {
      const { codeVerifier, codeChallenge } = await generateCodeChallenge();
      localStorage.setItem('github_code_verifier', codeVerifier);

      const params = new URLSearchParams({
        client_id: GITHUB_OAUTH_CONFIG.clientId,
        redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
        scope: GITHUB_OAUTH_CONFIG.scopes.join(' '),
        state: generateRandomState(),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      window.location.href = `${GITHUB_OAUTH_CONFIG.authorizationEndpoint}?${params}`;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'OAuth flow failed',
      });
    }
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('github_access_token');
    if (token) {
      set({
        accessToken: token,
        isAuthenticated: true,
      });
    }
  },
}));

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}
