import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/refresh',
];

// Rotas que sempre são públicas
const ALWAYS_PUBLIC = ['/api/webhooks'];

// Auth routes para rate limiting mais agressivo
const AUTH_ROUTES = ['/api/auth/login', '/api/auth/signup'];

// Helpers
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.',
        retry_after: retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // --- Rate Limiting ---
  // Apenas aplicar se Upstash estiver configurado
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { authRatelimit, apiRatelimit } = await import('@/lib/ratelimit');

      const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
      const limiter = isAuthRoute ? authRatelimit : apiRatelimit;
      const identifier = `${ip}:${isAuthRoute ? 'auth' : 'api'}`;

      const { success, reset, remaining, limit } = await limiter.limit(identifier);

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return rateLimitResponse(retryAfter);
      }

      // Adiciona headers de rate limit informativos na resposta
      const nextResponse = NextResponse.next();
      nextResponse.headers.set('X-RateLimit-Limit', String(limit));
      nextResponse.headers.set('X-RateLimit-Remaining', String(remaining));
      nextResponse.headers.set('X-RateLimit-Reset', String(reset));
    } catch {
      // Em caso de falha do Redis, não bloquear a requisição (fail open)
      console.warn('[RateLimit] Upstash indisponível, pulando rate limit.');
    }
  }

  // --- Rotas públicas: sem autenticação ---
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAlwaysPublic = ALWAYS_PUBLIC.some((route) => pathname.startsWith(route));

  if (isPublicRoute || isAlwaysPublic) {
    return NextResponse.next();
  }

  // --- Rotas protegidas: verificação de sessão ---
  if (pathname.startsWith('/api/')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' },
        },
        { status: 401 }
      );
    }

    response.headers.set('X-User-Id', user.id);
    response.headers.set('X-User-Email', user.email || '');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};