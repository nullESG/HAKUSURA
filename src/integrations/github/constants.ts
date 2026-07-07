// GitHub OAuth configuration
export const GITHUB_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liHvJVW8EHJa5SLz',
  redirectUri:
    import.meta.env.VITE_GITHUB_REDIRECT_URI ||
    `${window.location.origin}/auth/github/callback`,
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'user'],
};

export const GITHUB_API_BASE = 'https://api.github.com';
