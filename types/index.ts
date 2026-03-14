// Document types
export interface Document {
  id: string;
  title: string;
  owner_id: string;
  file_url: string;
  file_path: string;
  file_hash: string | null;
  status: DocumentStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_url: string;
  file_path: string;
  file_hash: string | null;
  created_by: string;
  created_at: string;
  change_notes: string | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  version?: number;
}

// Request types
export interface CreateDocumentRequest {
  title: string;
  status?: DocumentStatus;
}

export interface UpdateDocumentRequest {
  title?: string;
  status?: DocumentStatus;
}

export interface VerifyDocumentRequest {
  file: File;
}

export interface VerifyDocumentResponse {
  valid: boolean;
  document_id: string;
  version: number;
  stored_hash: string;
  provided_hash: string;
  message: string;
}

// Webhook types
export interface WebhookPayload {
  event: WebhookEvent;
  document_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export enum WebhookEvent {
  DOCUMENT_CREATED = 'document.created',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_SIGNED = 'document.signed',
  VERSION_CREATED = 'version.created',
}

// User types
export interface User {
  id: string;
  email: string;
  created_at: string;
}