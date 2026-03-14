import crypto from 'crypto';

/**
 * Gera hash SHA-256 de um arquivo
 * @param buffer - Buffer do arquivo
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Gera hash SHA-256 de uma string
 * @param data - String para hash
 * @returns Hash SHA-256 em formato hexadecimal
 */
export function generateStringHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compara dois hashes de forma segura (timing-safe)
 * @param hash1 - Primeiro hash
 * @param hash2 - Segundo hash
 * @returns true se os hashes são iguais
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash1, 'hex'),
      Buffer.from(hash2, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Gera um token aleatório seguro
 * @param length - Tamanho do token em bytes (default: 32)
 * @returns Token em formato hexadecimal
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Cria uma assinatura HMAC para webhooks
 * @param payload - Payload do webhook
 * @param secret - Secret key
 * @returns Assinatura HMAC
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifica assinatura de webhook
 * @param payload - Payload recebido
 * @param signature - Assinatura recebida
 * @param secret - Secret key
 * @returns true se a assinatura é válida
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return compareHashes(signature, expectedSignature);
}