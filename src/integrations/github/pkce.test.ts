import { describe, it, expect } from 'vitest';
import { generateCodeChallenge } from './pkce';

describe('PKCE utilities', () => {
  it('should generate code verifier and challenge', async () => {
    const { codeVerifier, codeChallenge } = await generateCodeChallenge();

    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();
    expect(typeof codeVerifier).toBe('string');
    expect(typeof codeChallenge).toBe('string');

    // Code verifier should be at least 128 characters (RFC 7636)
    expect(codeVerifier.length).toBe(128);

    // Code challenge should be base64url encoded
    expect(/^[A-Za-z0-9_-]+$/.test(codeChallenge)).toBe(true);
  });

  it('should generate unique code verifiers', async () => {
    const result1 = await generateCodeChallenge();
    const result2 = await generateCodeChallenge();

    expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
    expect(result1.codeChallenge).not.toBe(result2.codeChallenge);
  });
});
