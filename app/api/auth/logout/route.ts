import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = new NextResponse(JSON.stringify({ message: "Logout successful: HTTP-Only cookie cleared." }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    response.cookies.set('auth_token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error('Error during server-side logout:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process logout on server.' }), { status: 500 });
  }
}