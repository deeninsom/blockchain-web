import { NextResponse, NextRequest } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

const allowedOrigins = ['http://localhost:3000'];

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/v1/logistic/history',
  '/api/v1/blockchain/tx',
  '/api/test-besu',
  '/api/send-besu',
  '/public-tx',
  '/consumen'
];

const ROLE_PATHS = {
  SUPERADMIN: '/superadmin',
  FARMER: '/farmer',
  DISTRIBUTOR: '/distributor',
  ADMIN: '/admin',
  ADMIN_SERTIFIKASI: '/admin',
  WAREHOUSE_CENTER: '/operator',
  WAREHOUSE_RETAIL: '/operator'
};

export default async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const loginUrl = new URL('/', request.url);
  const currentPath = request.nextUrl.pathname;

  // 1. Handle OPTIONS (Preflight) - Sangat penting untuk CORS
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = { ...corsOptions };
    if (isAllowedOrigin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    return new NextResponse(null, { status: 204, headers });
  }

  // 2. JALUR CEPAT UNTUK API POST (Mencegah Body Locking)
  // Jika ini adalah API v1, kita batasi manipulasi request agar stream body aman
  const isApiRoute = currentPath.startsWith('/api/v1');

  const isPublicApi = PUBLIC_API_PATHS.some(path => currentPath.startsWith(path));
  if (isPublicApi) {
    const response = NextResponse.next();
    if (isAllowedOrigin) response.headers.set('Access-Control-Allow-Origin', origin);
    return response;
  }

  // 3. Verifikasi Token
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Jika API request tak punya token, return JSON jangan redirect
    if (isApiRoute) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(loginUrl);
  }

  let userRole: string | null = null;
  let isValid = false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded && decoded.role) {
      userRole = decoded.role;
      isValid = true;
    }
  } catch (e) {
    isValid = false;
  }

  if (!isValid) {
    if (isApiRoute) return NextResponse.json({ message: "Invalid Token" }, { status: 401 });
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  // 4. Role Authorization untuk Page (Bukan API)
  if (!isApiRoute) {
    const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS];
    if (!targetPath) return NextResponse.redirect(loginUrl);

    if (!currentPath.startsWith(targetPath)) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  // 5. FINAL RESPONSE
  // Gunakan NextResponse.next() tanpa modifikasi berlebihan pada header untuk API
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