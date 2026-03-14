import { createServerSupabaseClient } from './supabase';
import type { User } from '@/types';

/**
 * Obtém usuário autenticado da sessão atual
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
    created_at: user.created_at,
  };
}

/**
 * Verifica se usuário está autenticado
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  return user;
}

/**
 * Verifica se usuário é dono do recurso
 */
export async function requireOwnership(ownerId: string): Promise<void> {
  const user = await requireAuth();
  
  if (user.id !== ownerId) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Gera token JWT para usuário (para sessões customizadas)
 */
export async function generateJWT(userId: string): Promise<string> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.admin.createUser({
    id: userId,
    app_metadata: { provider: 'email' },
  });

  if (error) {
    throw new Error(`Erro ao gerar token: ${error.message}`);
  }

  return data.user?.id || '';
}