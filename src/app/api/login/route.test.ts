/** @vitest-environment node */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST } from './route';

beforeEach(() => {
  vi.stubEnv('APP_PASSWORD', 'secret-du-groupe');
  vi.stubEnv('SESSION_SECRET', 'a-very-long-test-secret-key-0123456789');
});

describe('POST /api/login', () => {
  it('returns 401 for a wrong password', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('sets a session cookie for the correct password', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret-du-groupe' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('clef_session=');
  });
});
