import { WebhookEvent, WebhookPayload } from '@/types';
import { generateWebhookSignature } from './crypto';

interface WebhookConfig {
  url: string;
  secret: string;
  events: WebhookEvent[];
}

/**
 * Dispara webhook para URL configurada
 */
export async function triggerWebhook(
  event: WebhookEvent,
  documentId: string,
  data: Record<string, unknown>,
  config?: WebhookConfig
): Promise<void> {
  // Se não há configuração de webhook, apenas loga
  if (!config && !process.env.WEBHOOK_URL) {
    console.log(`[Webhook] Evento ${event} para documento ${documentId}:`, data);
    return;
  }

  const webhookUrl = config?.url || process.env.WEBHOOK_URL;
  const webhookSecret = config?.secret || process.env.WEBHOOK_SECRET || 'default-secret';

  // Verifica se o evento deve ser enviado
  if (config && !config.events.includes(event)) {
    return;
  }

  const payload: WebhookPayload = {
    event,
    document_id: documentId,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, webhookSecret);

  try {
    const response = await fetch(webhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Secret': webhookSecret,
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.error(`[Webhook] Erro ao disparar webhook: ${response.status} ${response.statusText}`);
    } else {
      console.log(`[Webhook] Evento ${event} disparado com sucesso`);
    }
  } catch (error) {
    console.error(`[Webhook] Erro na requisição:`, error);
  }
}

/**
 * Dispara evento de documento assinado
 */
export async function triggerDocumentSignedWebhook(
  documentId: string,
  signedBy: string,
  signedAt: string
): Promise<void> {
  await triggerWebhook(
    WebhookEvent.DOCUMENT_SIGNED,
    documentId,
    {
      signed_by: signedBy,
      signed_at: signedAt,
    }
  );
}