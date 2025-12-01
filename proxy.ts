import { NextResponse, NextRequest } from 'next/server';

// Ganti nama fungsi menjadi middleware (opsional, tapi disarankan)
export async function proxy(request: NextRequest) {
  // 1. Dapatkan token dari Cookie, Header, atau lokasi lain
  // Contoh: Mendapatkan token dari 'auth_token' cookie
  const token = request.cookies.get('auth_token')?.value;

  // Anda juga bisa mencoba mendapatkan dari Authorization Header jika itu API route
  // const authHeader = request.headers.get('Authorization');
  // const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // URL tujuan pengalihan jika otentikasi gagal (misalnya, halaman login)
  const loginUrl = new URL('/', request.url);

  // 2. Lakukan Pemeriksaan Token

  if (!token) {
    // Jika token tidak ada, alihkan ke halaman login
    console.log('Token tidak ditemukan, mengalihkan ke /login');
    // Opsional: Tambahkan query parameter 'from' agar setelah login bisa kembali ke URL ini
    // loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Opsi Lanjutan: Memvalidasi Token (misalnya, dengan memanggil API)
  // Untuk skenario nyata, Anda mungkin perlu memanggil API untuk memvalidasi token JWT
  // const isValid = await validateTokenOnServer(token); // Anggap ini fungsi yang Anda buat

  // Contoh sederhana: Menganggap token valid hanya jika bernilai 'valid-secret-token'
  const isValid = token === 'valid-secret-token'; // GANTI dengan logika validasi nyata!

  if (!isValid) {
    console.log('Token tidak valid, mengalihkan ke /login');
    // Hapus token yang tidak valid (jika disimpan di cookie)
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  // 4. Jika token valid, lanjutkan ke rute yang diminta
  console.log('Token valid, melanjutkan akses...');
  return NextResponse.next();
}

// Konfigurasi matcher untuk menentukan path mana yang akan dilindungi
export const config = {
  // Melindungi semua path di bawah /dashboard/
  matcher: [
    '/dashboard/:path*',
    '/api/private/:path*'
  ],
};