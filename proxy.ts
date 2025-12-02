import { NextResponse, NextRequest } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload untuk typing

// ... (Bagian allowedOrigins, corsOptions, dan JWT_SECRET tetap sama)
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.60.12:3000'
];

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};


const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";


// --- Define Role Paths ---
const ROLE_PATHS = {
  Administrator: '/dashboard', // Asumsi Administrator menggunakan /dashboard
  Petani: '/farmer',
  // Tambahkan peran lain di sini jika ada
};

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const loginUrl = new URL('/', request.url);

  if (request.method === 'OPTIONS') {
    // ... (Logika Preflight tetap sama)
    const headers: Record<string, string> = {
      ...corsOptions,
    };

    if (isAllowedOrigin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return new NextResponse(null, { status: 204, headers });
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  let userRole: string | null = null;
  let isValid = false;

  // --- Perubahan Utama: Verifikasi dan Ekstraksi Role ---
  try {
    // Verifikasi dan simpan payload yang di-decode
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Asumsi role disimpan di payload token
    if (decoded && decoded.role) {
      userRole = decoded.role as string;
      isValid = true;
    } else {
      // Token valid, tapi tidak ada role
      console.error("JWT is missing a role property.");
      isValid = false;
    }

  } catch (e) {
    console.error("JWT Verification Failed:", e);
    isValid = false;
  }

  if (!isValid) {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  // --- Penanganan Otorisasi dan Redirect Berbasis Role ---

  const currentPath = request.nextUrl.pathname;
  const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS];

  // 1. Cek apakah pengguna mencoba mengakses halaman yang tidak termasuk API V1
  if (!currentPath.startsWith('/api/v1')) {

    // 2. Cek apakah ada target path untuk role ini
    if (!targetPath) {
      // Jika role tidak dikenal, mungkin arahkan ke halaman error atau default
      return NextResponse.redirect(loginUrl);
    }

    // 3. Cek apakah pengguna sudah berada di path yang benar (e.g., Petani di /farmer)
    if (!currentPath.startsWith(targetPath)) {

      // Jika pengguna sedang mencoba mengakses halaman yang dilindungi
      // dan bukan API, tapi diarahkan ke path yang salah.

      // Contoh: Admin mencoba mengakses /farmer
      // Contoh: Petani mencoba mengakses /dashboard

      // Kita hanya perlu mengalihkan jika path saat ini
      // TIDAK SAMA dengan path yang seharusnya

      console.log(`Redirecting user role '${userRole}' from ${currentPath} to ${targetPath}`);
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
    '/farmer/:path*',
    '/api/v1/:path*',
    // '/((?!api/v1/harvest/record|static|_next/static|_next/image|favicon.ico).*)',
  ],
};