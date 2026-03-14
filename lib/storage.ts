import { createServiceSupabaseClient } from './supabase';

const STORAGE_BUCKET = 'documents';

/**
 * Faz upload de arquivo para o Supabase Storage
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ path: string; url: string }> {
  const supabase = createServiceSupabaseClient();
  
  // Cria path estruturado: userId/timestamp-filename
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${userId}/${timestamp}-${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
  }

  // Gera URL pública assinada (válida por 1 ano)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signedUrlError) {
    throw new Error(`Erro ao gerar URL: ${signedUrlError.message}`);
  }

  return {
    path,
    url: signedUrlData.signedUrl,
  };
}

/**
 * Deleta arquivo do Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Erro ao deletar arquivo: ${error.message}`);
  }
}

/**
 * Gera URL assinada temporária para download
 */
export async function getSignedDownloadUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Erro ao gerar URL de download: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Copia arquivo para uma nova versão
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .copy(sourcePath, destinationPath);

  if (error) {
    throw new Error(`Erro ao copiar arquivo: ${error.message}`);
  }
}