/**
 * @vitest-environment node
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { checkPassword, createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from './auth';
import { SignJWT } from 'jose';

beforeEach(() => {
  vi.stubEnv('APP_PASSWORD', 'secret-du-groupe');
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('SESSION_COOKIE_NAME', () => {
  it('is a non-empty string', () => {
    expect(SESSION_COOKIE_NAME.length).toBeGreaterThan(0);
  });
});

describe('checkPassword', () => {
  it('accepts the configured password', () => {
    expect(checkPassword('secret-du-groupe')).toBe(true);
  });

  it('rejects any other password', () => {
    expect(checkPassword('wrong')).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(checkPassword('')).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips: a freshly created token verifies successfully', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it('rejects a tampered token', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(`${token}tampered`)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const expiredToken = await new SignJWT({ role: 'member' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);
    expect(await verifySessionToken(expiredToken)).toBe(false);
  });
});
