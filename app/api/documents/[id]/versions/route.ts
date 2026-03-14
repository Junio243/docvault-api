import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, commonErrors } from '@/lib/api-response';

/**
 * GET /api/documents/:id/versions
 * Retorna todas as versões de um documento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return commonErrors.unauthorized();
    }

    const { id } = params;
    const supabase = createServerSupabaseClient();

    // Verifica se documento existe e usuário tem acesso
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return commonErrors.notFound('Documento');
    }

    if (document.owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    // Busca todas as versões
    const { data: versions, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        created_by_user:created_by (
          id,
          email
        )
      `)
      .eq('document_id', id)
      .order('version', { ascending: false });

    if (error) {
      console.error('[Versions] Erro ao buscar versões:', error);
      return commonErrors.internalError('Erro ao buscar versões');
    }

    return successResponse(
      versions || [],
      {
        total: versions?.length || 0,
      }
    );

  } catch (error) {
    console.error('[Versions] Erro:', error);
    return commonErrors.internalError();
  }
}