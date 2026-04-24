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
// export async function GET(
//   req: NextRequest,
//   context: { params: Promise<{ id: string }> }// Gunakan tipe yang lebih sederhana setelah `await` dihapus
// ) {
//   try {
//     const eventId = (await (context.params)).id

//     // --- 1. AUTENTIKASI & OTORISASI ---
//     const token = req.cookies.get('auth_token')?.value;
//     if (!token) {
//       return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
//     }
//     const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
//     const actorUserId = decoded.id;
//     const actorUserRole = decoded.role;
//     if (!actorUserId) {
//       return NextResponse.json({ success: false, message: "Unauthorized or Invalid User." }, { status: 403 });
//     }

//     // --- 2. Tentukan Kondisi WHERE dengan Logika RBAC ---
//     const whereClause: any = {
//       id: eventId,
//       eventType: 1, // Pastikan ini adalah Harvest Event
//     };

//     // 🟡 PERBAIKAN RBAC KRITIS: Filter hanya jika perannya PETANI
//     if (actorUserRole === 'PETANI') {
//       // Jika Petani, dia HANYA boleh melihat event yang dia catat
//       whereClause.actorUserId = actorUserId;
//     }
//     // Jika perannya ADMIN, kita TIDAK MENAMBAHKAN filter actorUserId,
//     // sehingga query akan menemukan record berdasarkan eventId saja.

//     // --- 2. Ambil ProductEvent dari Database (Termasuk Status dari Batch) ---
//     const event = await prisma.productEvent.findUnique({
//       where: whereClause,
//       select: {
//         id: true,
//         batchId: true,
//         ipfsHash: true,
//         txHash: true,
//         createdAt: true,
//         // 🟢 PERBAIKAN: Join ke Batch untuk mendapatkan status
//         batch: {
//           select: {
//             status: true,
//             productName: true, // Ambil juga productName untuk fallback
//           },
//         },
//       },
//     });

//     if (!event) {
//       return NextResponse.json({ success: false, message: "Harvest record not found or unauthorized." }, { status: 404 });
//     }

//     // Fallback status jika batch/status tidak ada (meskipun seharusnya ada)
//     const batchStatus = event.batch?.status || (event.txHash ? "CONFIRMED" : "PENDING");

//     // --- 3. Ambil data detail dari IPFS ---
//     // Handle kasus jika ipfsHash belum ada (misal: error saat proses submit awal)
//     if (!event.ipfsHash) {
//       return jsonResponse({
//         id: event.id,
//         batchId: event.batchId,
//         ipfsHash: null,
//         txHash: event.txHash,
//         createdAt: event.createdAt.toISOString(),
//         location: "N/A",
//         harvestDate: event.createdAt.toISOString(),
//         quantity: "0",
//         unit: "N/A",
//         photoIpfsHash: null,
//         status: batchStatus,
//       });
//     }

//     const ipfsData = await getIpfsJson(event.ipfsHash);
//     if (!ipfsData) {
//       // Jika gagal ambil data IPFS, tetap kirim data event yang ada
//       return jsonResponse({
//         id: event.id,
//         batchId: event.batchId,
//         ipfsHash: event.ipfsHash,
//         txHash: event.txHash,
//         createdAt: event.createdAt.toISOString(),
//         location: "N/A (IPFS Failed)",
//         harvestDate: event.createdAt.toISOString(),
//         quantity: "0",
//         unit: "N/A",
//         photoIpfsHash: null,
//         status: batchStatus,
//       });
//     }


//     // --- 4. Gabungkan dan Format Hasil ---
//     const recordDetail = {
//       id: event.id,
//       batchId: event.batchId,
//       ipfsHash: event.ipfsHash,
//       txHash: event.txHash,
//       createdAt: event.createdAt.toISOString(),
//       location: ipfsData.location || "N/A",
//       productName: ipfsData.productName || event.batch?.productName || "N/A",
//       harvestDate: ipfsData.harvestDate || event.createdAt.toISOString(),
//       quantity: ipfsData.quantity || "0",
//       unit: ipfsData.unit || "kg",
//       photoIpfsHash: ipfsData.photoIpfsHash,

//       // 🟢 PERBAIKAN STATUS: Mengambil status dari tabel Batch
//       status: batchStatus,
//     };

//     return jsonResponse(recordDetail);

//   } catch (err: any) {
//     console.error(`GET Harvest Record ${(await (context.params)).id} Error:`, err.message);
//     return NextResponse.json({ success: false, message: "Failed to fetch record detail." }, { status: 500 });
//   }
// }

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const batchId = (await context.params).id;

    /* ===============================
       1. AUTH
    =============================== */

    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return jsonResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;

    const actorUserId = decoded.id;
    const actorUserRole = decoded.role;

    if (!actorUserId) {
      return jsonResponse(
        { success: false, message: "Unauthorized or Invalid User." },
        403
      );
    }

    /* ===============================
       2. WHERE CLAUSE
    =============================== */

    const whereClause: any = {
      batchRefId: batchId,
    };

    if (actorUserRole === "FARMER") {
      whereClause.actorUserId = actorUserId;
    }

    /* ===============================
       3. GET EVENTS
    =============================== */

    const events = await prisma.productEvent.findMany({
      where: whereClause,
      select: {
        id: true,
        batchId: true,
        ipfsHash: true,
        chainType: true,
        txHash: true,
        blockNumber: true,
        blockTimestamp: true,
        createdAt: true,
        batch: {
          select: {
            status: true,
            productName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!events.length) {
      return jsonResponse(
        { success: false, message: "No events found for this batch." },
        404
      );
    }

    const firstEvent = events[0];

    const batchStatus =
      firstEvent.batch?.status ||
      (events.some((e) => e.txHash) ? "CONFIRMED" : "PENDING");

    /* ===============================
       4. HANDLE IPFS UNIQUE
    =============================== */

    // Ambil semua ipfsHash unik
    const uniqueIpfsHashes = [
      ...new Set(events.map((e) => e.ipfsHash).filter(Boolean)),
    ];

    let ipfsList: any[] = [];

    for (const hash of uniqueIpfsHashes) {
      try {
        const data = await getIpfsJson(hash);
        ipfsList.push({
          ipfsHash: hash,
          data,
        });
      } catch {
        ipfsList.push({
          ipfsHash: hash,
          data: null,
        });
      }
    }

    // Kalau semua sama → cuma tampilkan 1
    const ipfsData =
      ipfsList.length === 1
        ? ipfsList[0].data
        : null; // kalau beda-beda nanti kita kirim array

    /* ===============================
       5. FORMAT RESPONSE
    =============================== */

    const recordDetail = {
      id: firstEvent.id,
      batchId: firstEvent.batchId,
      status: batchStatus,

      location: ipfsData?.location || "N/A",
      productName:
        ipfsData?.productName ||
        firstEvent.batch?.productName ||
        "N/A",
      harvestDate:
        ipfsData?.harvestDate ||
        firstEvent.createdAt.toISOString(),
      quantity: ipfsData?.quantity || "0",
      unit: ipfsData?.unit || "kg",
      photoIpfsHash: ipfsData?.photoIpfsHash || null,

      // 🔥 MULTI NETWORK
      networks: events.map((ev) => ({
        network: ev.chainType,
        txHash: ev.txHash,
        blockNumber: ev.blockNumber?.toString() || "0",
        blockTimestamp:
          ev.blockTimestamp?.toISOString() ||
          firstEvent.createdAt.toISOString(),
      })),

      // 🔥 IPFS RESULT
      ipfs:
        ipfsList.length === 1
          ? ipfsList[0] // tampilkan 1 saja
          : ipfsList,   // kalau beda tampilkan semua
    };

    return jsonResponse(recordDetail);

  } catch (err: any) {
    console.error("GET Batch Detail Error:", err.message);

    return jsonResponse(
      { success: false, message: "Failed to fetch batch detail." },
      500
    );
  }
}