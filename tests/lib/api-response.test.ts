import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module that uses it
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceSupabaseClient: vi.fn(),
}));

import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';

describe('api-response utilities', () => {
  describe('successResponse', () => {
    it('should return 200 with success:true and data', async () => {
      const res = successResponse({ id: '1', title: 'Doc' });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '1', title: 'Doc' });
    });

    it('should allow custom status code', async () => {
      const res = successResponse({ created: true }, undefined, 201);
      expect(res.status).toBe(201);
    });

    it('should include meta when provided', async () => {
      const res = successResponse([], { total: 50, page: 1, limit: 10 });
      const body = await res.json();
      expect(body.meta).toEqual({ total: 50, page: 1, limit: 10 });
    });
  });

  describe('errorResponse', () => {
    it('should return error with correct shape', async () => {
      const res = errorResponse('NOT_FOUND', 'Resource not found', 404);
      const body = await res.json();
      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found');
    });

    it('should include details when provided', async () => {
      const res = errorResponse('VALIDATION_ERROR', 'Invalid', 400, {
        field: ['required'],
      });
      const body = await res.json();
      expect(body.error.details).toEqual({ field: ['required'] });
    });
  });

  describe('commonErrors', () => {
    it('unauthorized() → 401', async () => {
      const res = commonErrors.unauthorized();
      expect(res.status).toBe(401);
      const b = await res.json();
      expect(b.error.code).toBe('UNAUTHORIZED');
    });

    it('forbidden() → 403', async () => {
      const res = commonErrors.forbidden();
      expect(res.status).toBe(403);
    });

    it('notFound() → 404', async () => {
      const res = commonErrors.notFound('Documento');
      expect(res.status).toBe(404);
      const b = await res.json();
      expect(b.error.message).toContain('Documento');
    });

    it('internalError() → 500', async () => {
      const res = commonErrors.internalError();
      expect(res.status).toBe(500);
    });

    it('validationError() → 400 with details', async () => {
      const res = commonErrors.validationError({ email: ['invalid email'] });
      expect(res.status).toBe(400);
      const b = await res.json();
      expect(b.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
