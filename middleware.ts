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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se é rota pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAlwaysPublic = ALWAYS_PUBLIC.some(route => pathname.startsWith(route));

  if (isPublicRoute || isAlwaysPublic) {
    return NextResponse.next();
  }

  // Verifica se é rota de API protegida
  if (pathname.startsWith('/api/')) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
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
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Verifica autenticação
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticação necessária',
          },
        },
        { status: 401 }
      );
    }

    // Adiciona informações do usuário no header para uso nos handlers
    response.headers.set('X-User-Id', user.id);
    response.headers.set('X-User-Email', user.email || '');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};