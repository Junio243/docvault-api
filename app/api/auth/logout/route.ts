import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { successResponse, commonErrors } from '@/lib/api-response';

/**
 * POST /api/auth/logout
 * Encerra a sessão do usuário
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return commonErrors.internalError('Erro ao encerrar sessão');
    }

    return successResponse({
      message: 'Logout realizado com sucesso',
    });

  } catch (error) {
    console.error('[Logout] Erro:', error);
    return commonErrors.internalError();
  }
}