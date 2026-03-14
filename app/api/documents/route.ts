import { NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { generateFileHash } from '@/lib/crypto';
import { triggerWebhook } from '@/lib/webhook';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { DocumentStatus, WebhookEvent } from '@/types';
import { z } from 'zod';
import type { Database } from '@/types/supabase';

type DocRow = Database['public']['Tables']['documents']['Row'];
type VersionRow = Database['public']['Tables']['document_versions']['Row'];

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  status: z.enum(['draft', 'pending', 'signed', 'archived']).optional(),
});

/**
 * GET /api/documents
 * Lista todos os documentos do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return commonErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: documents, error, count } = await query.range(from, to);

    if (error) {
      console.error('[Documents] Erro ao buscar documentos:', error);
      return commonErrors.internalError('Erro ao buscar documentos');
    }

    return successResponse(
      documents || [],
      {
        total: count || 0,
        page,
        limit,
      }
    );

  } catch (error) {
    console.error('[Documents] Erro:', error);
    return commonErrors.internalError();
  }
}

/**
 * POST /api/documents
 * Cria um novo documento com upload de arquivo
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return commonErrors.unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    // Validação de dados com Zod
    const rawData = {
      title: formData.get('title'),
      status: formData.get('status') || 'draft',
    };
    
    const parsed = createDocumentSchema.safeParse(rawData);
    
    if (!parsed.success) {
      return commonErrors.validationError(parsed.error.flatten().fieldErrors);
    }
    
    const { title, status } = parsed.data;

    // Validação do arquivo
    if (!file) {
      return errorResponse('FILE_REQUIRED', 'Arquivo é obrigatório', 400);
    }

    // Valida tipo do arquivo
    if (file.type !== 'application/pdf') {
      return errorResponse('INVALID_FILE_TYPE', 'Apenas arquivos PDF são aceitos', 400);
    }

    // Valida tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('FILE_TOO_LARGE', 'Arquivo deve ter no máximo 10MB', 400);
    }

    // Converte arquivo para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gera hash do arquivo
    const fileHash = generateFileHash(buffer);

    // Faz upload do arquivo
    const { path, url } = await uploadFile(buffer, file.name, file.type, user.id);

    // Cria documento no banco
    const supabase = createServiceSupabaseClient();
    
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        title,
        owner_id: user.id,
        file_url: url,
        file_path: path,
        file_hash: fileHash,
        status,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('[Documents] Erro ao criar documento:', error);
      return commonErrors.internalError('Erro ao criar documento');
    }

    // Cria versão inicial
    const { error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        version: 1,
        file_url: url,
        file_path: path,
        file_hash: fileHash,
        created_by: user.id,
        change_notes: 'Versão inicial',
      });

    if (versionError) {
      console.error('[Documents] Erro ao criar versão:', versionError);
    }

    // Dispara webhook
    await triggerWebhook(
      WebhookEvent.DOCUMENT_CREATED,
      (document as DocRow).id,
      {
        title: (document as DocRow).title,
        status: (document as DocRow).status,
        file_hash: fileHash,
      }
    );

    return successResponse(document, undefined, 201);

  } catch (error) {
    console.error('[Documents] Erro:', error);
    return commonErrors.internalError();
  }
}