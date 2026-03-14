import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

/**
 * POST /api/auth/login
 * Autentica um usuário e retorna sessão JWT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validação dos dados
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return commonErrors.validationError(validation.error.flatten().fieldErrors);
    }

    const { email, password } = validation.data;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse('INVALID_CREDENTIALS', 'Email ou senha inválidos', 401);
    }

    if (!data.session || !data.user) {
      return commonErrors.internalError('Erro ao criar sessão');
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
    });

  } catch (error) {
    console.error('[Login] Erro:', error);
    return commonErrors.internalError();
  }
}