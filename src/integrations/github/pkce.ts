// PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
export async function generateCodeChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier).then(base64urlEncode);
  return { codeVerifier, codeChallenge };
}

function generateRandomString(length: number): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  if (!globalThis.crypto) {
    throw new Error('crypto.getRandomValues is not available');
  }
  globalThis.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[(randomValues[i]!) % charset.length];
  }
  return result;
}

async function sha256(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  if (!globalThis.crypto?.subtle) {
    throw new Error('crypto.subtle is not available');
  }
  return globalThis.crypto.subtle.digest('SHA-256', encoder.encode(data));
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  const binary = String.fromCharCode(...view);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
