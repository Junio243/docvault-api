import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  generateFileHash: vi.fn().mockReturnValue('abc123-hash'),
}));

vi.mock('@/lib/webhook', () => ({
  triggerWebhook: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { GET } from '@/app/api/documents/route';

// Helper to create a fake NextRequest
function makeRequest(url = 'http://localhost/api/documents') {
  return new Request(url) as unknown as import('next/server').NextRequest;
}

describe('GET /api/documents', () => {
  it('should return 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should call supabase and return documents when authenticated', async () => {
    const fakeUser = { id: 'user-1', email: 'a@b.com', created_at: '' };
    vi.mocked(getCurrentUser).mockResolvedValueOnce(fakeUser);

    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const fakeQuery = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    };
    vi.mocked(createServerSupabaseClient).mockReturnValue(fakeQuery as any);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('should handle supabase error gracefully → 500', async () => {
    const fakeUser = { id: 'user-1', email: 'a@b.com', created_at: '' };
    vi.mocked(getCurrentUser).mockResolvedValueOnce(fakeUser);

    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const fakeQuery = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' }, count: 0 }),
    };
    vi.mocked(createServerSupabaseClient).mockReturnValue(fakeQuery as any);

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
