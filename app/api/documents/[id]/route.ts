import { NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile, deleteFile } from '@/lib/storage';
import { generateFileHash } from '@/lib/crypto';
import { triggerWebhook, triggerDocumentSignedWebhook } from '@/lib/webhook';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { DocumentStatus, WebhookEvent } from '@/types';
import { z } from 'zod';

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['draft', 'pending', 'signed', 'archived']).optional(),
});

/**
 * GET /api/documents/:id
 * Retorna um documento específico
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

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      return commonErrors.notFound('Documento');
    }

    // Verifica se usuário é o dono
    if ((document as any).owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    return successResponse(document);

  } catch (error) {
    console.error('[Document] Erro:', error);
    return commonErrors.internalError();
  }
}

/**
 * PATCH /api/documents/:id
 * Atualiza um documento (título, status ou arquivo)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return commonErrors.unauthorized();
    }

    const { id } = params;
    const supabase = createServiceSupabaseClient();

    // Busca documento existente
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDoc) {
      return commonErrors.notFound('Documento');
    }

    // Verifica se usuário é o dono
    if ((existingDoc as any).owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const status = formData.get('status') as string | null;
    const changeNotes = formData.get('change_notes') as string | null;

    const updates: Record<string, unknown> = {};
    let newVersion = (existingDoc as any).version;
    let newFileHash = (existingDoc as any).file_hash;
    let newFileUrl = (existingDoc as any).file_url;
    let newFilePath = (existingDoc as any).file_path;

    // Processa novo arquivo se fornecido
    if (file) {
      if (file.type !== 'application/pdf') {
        return errorResponse('INVALID_FILE_TYPE', 'Apenas arquivos PDF são aceitos', 400);
      }

      if (file.size > 10 * 1024 * 1024) {
        return errorResponse('FILE_TOO_LARGE', 'Arquivo deve ter no máximo 10MB', 400);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Gera hash do novo arquivo
      newFileHash = generateFileHash(buffer);

      // Faz upload do novo arquivo
      const uploadResult = await uploadFile(buffer, file.name, file.type, user.id);
      newFileUrl = uploadResult.url;
      newFilePath = uploadResult.path;

      // Incrementa versão
      newVersion = (existingDoc as any).version + 1;

      // Cria registro de versão anterior
      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: id,
          version: (existingDoc as any).version,
          file_url: (existingDoc as any).file_url,
          file_path: (existingDoc as any).file_path,
          file_hash: (existingDoc as any).file_hash,
          created_by: user.id,
          change_notes: changeNotes || `Atualização para versão ${newVersion}`,
        });

      if (versionError) {
        console.error('[Document] Erro ao criar versão:', versionError);
      }

      // Dispara webhook de nova versão
      await triggerWebhook(
        WebhookEvent.VERSION_CREATED,
        id,
        {
          previous_version: (existingDoc as any).version,
          new_version: newVersion,
          change_notes: changeNotes,
        }
      );

      updates.file_url = newFileUrl;
      updates.file_path = newFilePath;
      updates.file_hash = newFileHash;
      updates.version = newVersion;
    }

    // Atualiza título se fornecido
    if (title !== null) {
      updates.title = title;
    }

    // Atualiza status se fornecido
    if (status !== null) {
      updates.status = status;

      // Se o status mudou para signed, dispara webhook
      if (status === 'signed' && (existingDoc as any).status !== 'signed') {
        await triggerDocumentSignedWebhook(
          id,
          user.id,
          new Date().toISOString()
        );
      }
    }

    // Atualiza timestamp
    updates.updated_at = new Date().toISOString();

    // Salva alterações no banco
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Document] Erro ao atualizar:', updateError);
      return commonErrors.internalError('Erro ao atualizar documento');
    }

    // Dispara webhook de atualização
    await triggerWebhook(
      WebhookEvent.DOCUMENT_UPDATED,
      id,
      {
        changes: Object.keys(updates),
        new_version: newVersion,
      }
    );

    return successResponse(updatedDoc);

  } catch (error) {
    console.error('[Document] Erro:', error);
    return commonErrors.internalError();
  }
}

/**
 * DELETE /api/documents/:id
 * Deleta um documento e todas as suas versões
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return commonErrors.unauthorized();
    }

    const { id } = params;
    const supabase = createServiceSupabaseClient();

    // Busca documento
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return commonErrors.notFound('Documento');
    }

    // Verifica se usuário é o dono
    if ((document as any).owner_id !== user.id) {
      return commonErrors.forbidden();
    }

    // Busca todas as versões para deletar os arquivos
    const { data: versions, error: versionsError } = await supabase
      .from('document_versions')
      .select('file_path')
      .eq('document_id', id);

    if (versionsError) {
      console.error('[Document] Erro ao buscar versões:', versionsError);
    }

    // Deleta arquivos do storage
    const filesToDelete = [(document as any).file_path];
    if (versions) {
      filesToDelete.push(...(versions as any[]).map(v => (v as any).file_path));
    }

    // Deleta arquivos únicos
    const uniqueFiles = [...new Set(filesToDelete)];
    for (const filePath of uniqueFiles) {
      try {
        await deleteFile(filePath);
      } catch (error) {
        console.error(`[Document] Erro ao deletar arquivo ${filePath}:`, error);
      }
    }

    // Deleta versões do banco
    await supabase
      .from('document_versions')
      .delete()
      .eq('document_id', id);

    // Deleta documento
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Document] Erro ao deletar:', deleteError);
      return commonErrors.internalError('Erro ao deletar documento');
    }

    // Dispara webhook
    await triggerWebhook(
      WebhookEvent.DOCUMENT_DELETED,
      id,
      {
        title: (document as any).title,
        deleted_by: user.id,
      }
    );

    return successResponse({
      message: 'Documento deletado com sucesso',
      deleted_id: id,
    });

  } catch (error) {
    console.error('[Document] Erro:', error);
    return commonErrors.internalError();
  }
}