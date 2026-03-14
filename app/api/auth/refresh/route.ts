import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { z } from 'zod';

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
});

/**
 * POST /api/auth/refresh
 * Renova o access token usando o refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validação dos dados
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      return commonErrors.validationError(validation.error.flatten().fieldErrors);
    }

    const { refresh_token } = validation.data;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return errorResponse('REFRESH_ERROR', 'Token inválido ou expirado', 401);
    }

    if (!data.session) {
      return commonErrors.unauthorized();
    }

    return successResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
    });

  } catch (error) {
    console.error('[Refresh] Erro:', error);
    return commonErrors.internalError();
  }
}