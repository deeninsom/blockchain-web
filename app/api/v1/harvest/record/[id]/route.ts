// src/app/api/v1/harvest/record/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

/**
 * GET Handler untuk mengambil satu catatan panen berdasarkan ID ProductEvent.
 * URL: /api/v1/harvest/record/[id]
 * Status diambil dari tabel Batch yang berelasi.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }// Gunakan tipe yang lebih sederhana setelah `await` dihapus
) {
  try {
    const eventId = (await (context.params)).id

    // --- 1. AUTENTIKASI & OTORISASI ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    const actorUserRole = decoded.role;
    if (!actorUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized or Invalid User." }, { status: 403 });
    }

    // --- 2. Tentukan Kondisi WHERE dengan Logika RBAC ---
    const whereClause: any = {
      id: eventId,
      eventType: 1, // Pastikan ini adalah Harvest Event
    };

    // 🟡 PERBAIKAN RBAC KRITIS: Filter hanya jika perannya PETANI
    if (actorUserRole === 'PETANI') {
      // Jika Petani, dia HANYA boleh melihat event yang dia catat
      whereClause.actorUserId = actorUserId;
    }
    // Jika perannya ADMIN, kita TIDAK MENAMBAHKAN filter actorUserId,
    // sehingga query akan menemukan record berdasarkan eventId saja.

    // --- 2. Ambil ProductEvent dari Database (Termasuk Status dari Batch) ---
    const event = await prisma.productEvent.findUnique({
      where: whereClause,
      select: {
        id: true,
        batchId: true,
        ipfsHash: true,
        txHash: true,
        createdAt: true,
        // 🟢 PERBAIKAN: Join ke Batch untuk mendapatkan status
        batch: {
          select: {
            status: true,
            productName: true, // Ambil juga productName untuk fallback
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Harvest record not found or unauthorized." }, { status: 404 });
    }

    // Fallback status jika batch/status tidak ada (meskipun seharusnya ada)
    const batchStatus = event.batch?.status || (event.txHash ? "CONFIRMED" : "PENDING");

    // --- 3. Ambil data detail dari IPFS ---
    // Handle kasus jika ipfsHash belum ada (misal: error saat proses submit awal)
    if (!event.ipfsHash) {
      return jsonResponse({
        id: event.id,
        batchId: event.batchId,
        ipfsHash: null,
        txHash: event.txHash,
        createdAt: event.createdAt.toISOString(),
        location: "N/A",
        harvestDate: event.createdAt.toISOString(),
        quantity: "0",
        unit: "N/A",
        photoIpfsHash: null,
        status: batchStatus,
      });
    }

    const ipfsData = await getIpfsJson(event.ipfsHash);
    if (!ipfsData) {
      // Jika gagal ambil data IPFS, tetap kirim data event yang ada
      return jsonResponse({
        id: event.id,
        batchId: event.batchId,
        ipfsHash: event.ipfsHash,
        txHash: event.txHash,
        createdAt: event.createdAt.toISOString(),
        location: "N/A (IPFS Failed)",
        harvestDate: event.createdAt.toISOString(),
        quantity: "0",
        unit: "N/A",
        photoIpfsHash: null,
        status: batchStatus,
      });
    }


    // --- 4. Gabungkan dan Format Hasil ---
    const recordDetail = {
      id: event.id,
      batchId: event.batchId,
      ipfsHash: event.ipfsHash,
      txHash: event.txHash,
      createdAt: event.createdAt.toISOString(),
      location: ipfsData.location || "N/A",
      productName: ipfsData.productName || event.batch?.productName || "N/A",
      harvestDate: ipfsData.harvestDate || event.createdAt.toISOString(),
      quantity: ipfsData.quantity || "0",
      unit: ipfsData.unit || "kg",
      photoIpfsHash: ipfsData.photoIpfsHash,

      // 🟢 PERBAIKAN STATUS: Mengambil status dari tabel Batch
      status: batchStatus,
    };

    return jsonResponse(recordDetail);

  } catch (err: any) {
    console.error(`GET Harvest Record ${(await (context.params)).id} Error:`, err.message);
    return NextResponse.json({ success: false, message: "Failed to fetch record detail." }, { status: 500 });
  }
}