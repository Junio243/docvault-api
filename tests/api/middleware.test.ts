// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.unmock('next/server');
const mocks = vi.hoisted(() => ({ limit: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ authRatelimit: { limit: mocks.limit }, apiRatelimit: { limit: mocks.limit } }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.test');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-only');
  mocks.limit.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 123456 });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('rate limit response headers', () => {
  it.each(['/api/auth/login', '/api/documents'])('preserves headers for %s', async path => {
    const response = await middleware(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('123456');
  });
  it('includes quota information on unauthorized responses', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await middleware(new NextRequest('http://localhost/api/documents'));
    expect(response.status).toBe(401);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59');
  });
  it('reports the real limit and a positive retry delay when blocked', async () => {
    mocks.limit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() - 1000 });
    const response = await middleware(new NextRequest('http://localhost/api/auth/login'));
    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('Retry-After')).toBe('1');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('still verifies authentication if the rate limit service fails', async () => {
    mocks.limit.mockRejectedValue(new Error('Redis unavailable'));
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await middleware(new NextRequest('http://localhost/api/documents'));
    expect(response.status).toBe(401);
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });
});
