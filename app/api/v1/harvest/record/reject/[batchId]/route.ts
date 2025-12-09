import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ValidationStatus } from '@prisma/client'; // Import ValidationStatus enum dari Prisma client

// --- KONFIGURASI DAN TIPE ---
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

// Handler untuk aksi TOLAK (Reject)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> }// Menggunakan Batch ID unik dari SC
) {
  const uniqueBatchId = (await (context.params)).batchId;

  if (!uniqueBatchId) {
    return NextResponse.json(
      { success: false, message: "Parameter Batch ID wajib diisi di URL." },
      { status: 400 }
    );
  }

  try {
    // --- 1. AUTENTIKASI & OTORISASI ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    let decoded: CustomJwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    } catch (err) {
      return NextResponse.json({ success: false, message: "Invalid token." }, { status: 401 });
    }

    const actorUserId = decoded.id;
    if (!actorUserId) throw new Error("User ID is missing from token.");

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat menolak." }, { status: 403 });
    }

    // Ambil payload JSON (hanya Notes)
    const { notes } = await req.json();

    // 🛑 Validasi Notes
    if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: "Catatan penolakan wajib diisi, minimal 10 karakter." },
        { status: 400 }
      );
    }

    // --- 2. CEK BATCH STATUS BERDASARKAN uniqueBatchId ---
    const existingBatch = await prisma.batch.findUnique({
      where: { batchId: uniqueBatchId },
    });

    if (!existingBatch) {
      return NextResponse.json({ success: false, message: "Batch ID tidak ditemukan." }, { status: 404 });
    }

    // Hanya PENDING yang bisa diproses
    if (existingBatch.status !== ValidationStatus.PENDING) {
      return NextResponse.json({ success: false, message: `Status batch sudah ${existingBatch.status}. Penolakan tidak dapat dilakukan.` }, { status: 400 });
    }


    // --- 3. UPDATE STATUS BATCH MENJADI REJECTED ---
    const updatedBatch = await prisma.batch.update({
      where: { id: existingBatch.id },
      data: {
        status: ValidationStatus.REJECTED, // ⬅️ Status Diubah menjadi REJECTED
        updatedAt: new Date(),
        rejectionNotes: notes, // 🟢 Simpan catatan penolakan
        verifiedByUserId: actorUserId, // 🟢 Catat Admin yang menolak
      }
    });

    // --- 4. RESPONS SUKSES ---
    return NextResponse.json({
      success: true,
      message: `Catatan panen Batch ${uniqueBatchId} berhasil ditolak.`,
      batchId: updatedBatch.batchId,
      batchStatus: updatedBatch.status
    }, { status: 200 });

  } catch (error: any) {
    console.error("Rejection PATCH Error:", error);
    return NextResponse.json({ success: false, message: `Internal server error: ${error.message}` }, { status: 500 });
  }
}