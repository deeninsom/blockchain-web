import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });

    let decoded: CustomJwtPayload;
    try { decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload; }
    catch { return NextResponse.json({ success: false, message: "Invalid token." }, { status: 401 }); }

    if (decoded.role !== 'ADMIN')
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat memverifikasi." }, { status: 403 });

    let body: any = {};
    try { body = await req.json(); }
    catch { return NextResponse.json({ success: false, message: "Request body harus JSON yang valid." }, { status: 400 }); }

    const { batchId } = body;
    if (!batchId)
      return NextResponse.json({ success: false, message: "batchId wajib disertakan." }, { status: 400 });

    // --- CEK BATCH ---
    const existingBatch = await prisma.batch.findUnique({ where: { id: batchId } });

    if (!existingBatch) {
      return NextResponse.json({
        success: false,
        message: `Batch dengan id ${batchId} tidak ditemukan.`,
      }, { status: 404 });
    }

    if (existingBatch.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        message: `Batch sudah ${existingBatch.status}. Tidak bisa diverifikasi ulang.`,
      }, { status: 400 });
    }

    // --- UPDATE STATUS ---
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: { status: 'VERIFIED', updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Batch berhasil diverifikasi.",
      batchId: updatedBatch.id,
      batchStatus: updatedBatch.status
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification POST Error:", error);
    return NextResponse.json({ success: false, message: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
