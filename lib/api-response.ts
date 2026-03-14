import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ApiMeta } from '@/types';

/**
 * Cria uma resposta de sucesso padronizada
 */
export function successResponse<T>(
  data: T,
  meta?: ApiMeta,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
    },
    { status }
  );
}

/**
 * Cria uma resposta de erro padronizada
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ApiResponse> {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };

  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Respostas de erro comuns
 */
export const commonErrors = {
  unauthorized: () => errorResponse('UNAUTHORIZED', 'Autenticação necessária', 401),
  forbidden: () => errorResponse('FORBIDDEN', 'Acesso negado', 403),
  notFound: (resource: string = 'Recurso') => 
    errorResponse('NOT_FOUND', `${resource} não encontrado`, 404),
  badRequest: (message: string = 'Requisição inválida') => 
    errorResponse('BAD_REQUEST', message, 400),
  internalError: (message: string = 'Erro interno do servidor') => 
    errorResponse('INTERNAL_ERROR', message, 500),
  validationError: (details: Record<string, unknown>) => 
    errorResponse('VALIDATION_ERROR', 'Dados de entrada inválidos', 400, details),
};