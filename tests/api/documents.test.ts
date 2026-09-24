import { beforeEach, describe, it, expect, vi } from 'vitest';

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
import { GET, POST } from '@/app/api/documents/route';
import { uploadFile, deleteFile } from '@/lib/storage';
import { createServiceSupabaseClient } from '@/lib/supabase';

beforeEach(() => vi.clearAllMocks());

describe('POST /api/documents', () => {
  function uploadRequest(content: string, title = 'Contrato') {
    const form = new FormData();
    form.set('file', new File([content], 'document.pdf', { type: 'application/pdf' }));
    form.set('title', title);
    return { formData: async () => form } as unknown as import('next/server').NextRequest;
  }
  it.each([
    ['', 'Contrato', 'EMPTY_FILE'],
    ['not a pdf', 'Contrato', 'INVALID_FILE_TYPE'],
    ['%PDF-1.7\n', '   ', 'VALIDATION_ERROR'],
  ])('rejects invalid uploads before storage writes', async (content, title, code) => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'user-1', email: 'a@b.com', created_at: '' });
    const res = await POST(uploadRequest(content, title));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(code);
    expect(uploadFile).not.toHaveBeenCalled();
  });
  it('removes the uploaded file if document insertion fails', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'user-1', email: 'a@b.com', created_at: '' });
    vi.mocked(uploadFile).mockResolvedValueOnce({ path: 'user-1/new.pdf', url: 'https://example.test/new.pdf' });
    const query = {
      from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db unavailable' } }),
    };
    vi.mocked(createServiceSupabaseClient).mockReturnValue(query as any);
    const res = await POST(uploadRequest('%PDF-1.7\n'));
    expect(res.status).toBe(500);
    expect(deleteFile).toHaveBeenCalledWith('user-1/new.pdf');
  });
});

// Helper to create a fake NextRequest
function makeRequest(url = 'http://localhost/api/documents') {
  return new Request(url) as unknown as import('next/server').NextRequest;
}

describe('GET /api/documents', () => {
  it.each(['page=0', 'page=-1', 'page=abc', 'page=1.5', 'page=1x', 'page=9007199254740991&limit=50', 'limit=0', 'limit=-2', 'limit=NaN', 'status=unknown'])('rejects invalid filters: %s', async query => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'user-1', email: 'a@b.com', created_at: '' });
    const res = await GET(makeRequest(`http://localhost/api/documents?${query}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('caps page size and keeps the owner filter when searching', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'user-1', email: 'a@b.com', created_at: '' });
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const query = {
      from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    };
    vi.mocked(createServerSupabaseClient).mockReturnValue(query as any);
    const res = await GET(makeRequest('http://localhost/api/documents?page=2&limit=100&status=draft&search=contrato'));
    expect(res.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'user-1');
    expect(query.eq).toHaveBeenCalledWith('status', 'draft');
    expect(query.ilike).toHaveBeenCalledWith('title', '%contrato%');
    expect(query.range).toHaveBeenCalledWith(50, 99);
    expect((await res.json()).meta).toMatchObject({ page: 2, limit: 50 });
  });
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
