import type { Database } from '@/types/supabase';

type DocRow = Database['public']['Tables']['documents']['Row'];
type VersionRow = Database['public']['Tables']['document_versions']['Row'];
import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { generateFileHash, compareHashes } from '@/lib/crypto';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import type { VerifyDocumentResponse } from '@/types';

/**
 * POST /api/documents/:id/verify
 * Verifica a integridade de um arquivo comparando seu hash SHA-256
 */
export async function POST(
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
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return commonErrors.notFound('Documento');
    }

    if ((document as DocRow).owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    // Verifica se o documento tem hash registrado
    if (!(document as DocRow).file_hash) {
      return errorResponse(
        'NO_HASH_REGISTERED',
        'Este documento não possui hash registrado para verificação',
        400
      );
    }

    // Obtém o arquivo da requisição
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('FILE_REQUIRED', 'Arquivo é obrigatório para verificação', 400);
    }

    // Valida tipo do arquivo
    if (file.type !== 'application/pdf') {
      return errorResponse('INVALID_FILE_TYPE', 'Apenas arquivos PDF são aceitos', 400);
    }

    // Converte arquivo para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gera hash do arquivo fornecido
    const providedHash = generateFileHash(buffer);

    // Compara os hashes (timing-safe)
    const isValid = compareHashes((document as DocRow).file_hash || '', providedHash);

    const result: VerifyDocumentResponse = {
      valid: isValid,
      document_id: id,
      version: (document as DocRow).version,
      stored_hash: (document as DocRow).file_hash || '',
      provided_hash: providedHash,
      message: isValid 
        ? 'Integridade verificada: O arquivo é idêntico ao registrado'
        : 'ALERTA: O arquivo foi alterado! Os hashes não correspondem.',
    };

    return successResponse(result);

  } catch (error) {
    console.error('[Verify] Erro:', error);
    return commonErrors.internalError();
  }
}

/**
 * GET /api/documents/:id/verify
 * Retorna informações do hash do documento (sem verificação)
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
      .select('id, title, version, file_hash, file_url, updated_at')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return commonErrors.notFound('Documento');
    }

    if ((document as DocRow).owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    return successResponse({
      document_id: (document as DocRow).id,
      title: (document as DocRow).title,
      version: (document as DocRow).version,
      file_hash: (document as DocRow).file_hash,
      file_url: (document as DocRow).file_url,
      updated_at: (document as DocRow).updated_at,
      has_hash: !!(document as DocRow).file_hash,
      message: (document as DocRow).file_hash 
        ? 'Documento possui hash SHA-256 registrado'
        : 'Documento não possui hash registrado',
    });

  } catch (error) {
    console.error('[Verify] Erro:', error);
    return commonErrors.internalError();
  }
}