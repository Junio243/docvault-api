import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

/**
 * POST /api/auth/signup
 * Registra um novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validação dos dados
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return commonErrors.validationError(validation.error.flatten().fieldErrors);
    }

    const { email, password } = validation.data;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    });

    if (error) {
      return errorResponse('SIGNUP_ERROR', error.message, 400);
    }

    if (!data.user) {
      return commonErrors.internalError('Erro ao criar usuário');
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      message: 'Usuário criado com sucesso. Verifique seu email para confirmar.',
    }, undefined, 201);

  } catch (error) {
    console.error('[Signup] Erro:', error);
    return commonErrors.internalError();
  }
}