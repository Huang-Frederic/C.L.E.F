/** @vitest-environment node */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('middleware', () => {
  it('redirects to /login when there is no session cookie', async () => {
    const request = new NextRequest('http://localhost/');
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('lets the request through when the session cookie is valid', async () => {
    const token = await createSessionToken();
    const request = new NextRequest('http://localhost/', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
