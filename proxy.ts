import { NextResponse, NextRequest } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

const allowedOrigins = [
  'http://localhost:3000',
];

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};


const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/v1/blockchain/tx',
  '/public-tx'
];

const ROLE_PATHS = {
  SUPERADMIN: '/superadmin',
  FARMER: '/farmer',
  DISTRIBUTOR: '/distributor',
  ADMIN: '/admin',
  WAREHOUSE_CENTER: '/operator',
  WAREHOUSE_RETAIL: '/operator'
};

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const loginUrl = new URL('/', request.url);
  const currentPath = request.nextUrl.pathname;

  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      ...corsOptions,
    };

    if (isAllowedOrigin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return new NextResponse(null, { status: 204, headers });
  }

  const isPublicApi = PUBLIC_API_PATHS.some(path => currentPath.startsWith(path));

  if (isPublicApi) {
    const response = NextResponse.next();

    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    return response;
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  let userRole: string | null = null;
  let isValid = false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (decoded && decoded.role) {
      userRole = decoded.role as string;
      isValid = true;
    } else {
      isValid = false;
    }

  } catch (e) {
    isValid = false;
  }

  if (!isValid) {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS];

  if (!currentPath.startsWith('/api/v1')) {

    if (!targetPath) {
      return NextResponse.redirect(loginUrl);
    }

    if (!currentPath.startsWith(targetPath)) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/superadmin/:path*',
    '/farmer/:path*',
    '/operator/:path*',
    '/api/v1/:path*'
  ],
};