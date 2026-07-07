import { GITHUB_OAUTH_CONFIG } from './constants';

export async function exchangeCodeForToken(code: string): Promise<string> {
  const codeVerifier = localStorage.getItem('github_code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  // Note: In a real app, this exchange should happen on a backend server
  // to avoid exposing the client secret. For now, this uses the web application flow.
  // A proper implementation would require a backend proxy that handles token exchange.
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    code,
    code_verifier: codeVerifier,
  });

  // This endpoint typically requires client_secret which should be kept server-side
  // For client-side only auth, you may need to use GitHub's device flow or
  // implement a backend proxy
  const response = await fetch(GITHUB_OAUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
  };

  if (data.error) {
    throw new Error(`OAuth error: ${data.error}`);
  }

  if (!data.access_token) {
    throw new Error('No access token received');
  }

  return data.access_token;
}
