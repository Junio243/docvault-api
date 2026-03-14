import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, commonErrors } from '@/lib/api-response';

/**
 * GET /api/auth/me
 * Retorna informações do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return commonErrors.unauthorized();
    }

    return successResponse({
      user,
    });

  } catch (error) {
    console.error('[Me] Erro:', error);
    return commonErrors.internalError();
  }
}