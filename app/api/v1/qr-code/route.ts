import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Samakan dengan yang ada di route login Anda
const JWT_SECRET = process.env.AUTH_SECRET || "DEFAULT_SECRET_FOR_DEV_ONLY";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak ditemukan" },
        { status: 401 }
      );
    }

    // --- PROSES DECODE JWT ---
    let farmerId: string;
    try {
      // Melakukan verifikasi token menggunakan library yang sama (jsonwebtoken)
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string,
        role: string
      };

      farmerId = decoded.id;

      // Proteksi tambahan: Pastikan yang mengakses memang memiliki role FARMER
      if (decoded.role !== "FARMER") {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda bukan petani" },
          { status: 403 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { success: false, message: "Token tidak valid atau kadaluarsa" },
        { status: 401 }
      );
    }

    // --- QUERY DATA BATCH UNIK ---
    const uniqueRecords = await prisma.batch.findMany({
      where: {
        farmerId: farmerId,
        status: 'CONFIRMED'
      },
      distinct: ['batchId'], // Solusi utama agar data tidak tampil berulang
      select: {
        id: true,
        batchId: true,
        productName: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      records: uniqueRecords,
    });

  } catch (error) {
    console.error("BATCH FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses data batch" },
      { status: 500 }
    );
  }
}