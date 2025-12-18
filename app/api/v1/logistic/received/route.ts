// app/api/v1/logistic/received/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { signAndSendTransaction } from "@/lib/blockchain/transaction";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";
const RECEIVED_EVENT_TYPE = 4; // Mengubah Event Type menjadi 4 (RECEIVED)

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

// Tipe untuk Aktor yang diambil dari Prisma
type PrismaUser = {
  id: string;
  actorAddress: string | null;
  // Tambahkan field lain yang Anda butuhkan
};

// Payload yang akan disimpan ke IPFS untuk Event RECEIVED
interface ReceivedIpfsPayload {
  batchId: string;
  eventType: number;
  actorUserId: string;
  quantity: string;
  unit: string;
  location: string;
  notes: string;
  timestamp: string;
}

// Mengubah nama interface dan isinya dari Pickup ke Received
interface ReceivedRequestBody {
  batchId: string;
  batchRefId: string;
  senderAddress: string; // Menggantikan farmerAddress menjadi senderAddress (Pengirim)
  quantity: string;
  unit: string;
  gpsCoordinates: string;
  notes: string;
}

/**
 * Endpoint POST untuk mencatat transaksi Penerimaan (Event Type 4: RECEIVED).
 * URL: /api/v1/logistic/received
 */
export async function POST(req: NextRequest) {
  let actorUser: PrismaUser | null = null;

  try {
    // --- 1. OTORISASI ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return jsonResponse({ success: false, message: "Authentication required." }, 401);
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    const actorRole = decoded.role;

    // Aktor yang diizinkan untuk menerima (RETAIL, CENTRAL, atau WAREHOUSE)
    if (!actorUserId || (actorRole !== 'RETAIL_OPERATOR' && actorRole !== 'CENTRAL_OPERATOR' && actorRole !== 'WAREHOUSE')) {
      return jsonResponse({ success: false, message: "Unauthorized role for receiving goods." }, 403);
    }

    // Ambil User Aktor (Penerima)
    actorUser = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, actorAddress: true }
    });

    // Cek Ketersediaan Wallet Aktor Penerima
    if (!actorUser || !actorUser.actorAddress) throw new Error("Receiver wallet address not found or not registered.");

    const body: ReceivedRequestBody = await req.json();
    // Menggunakan senderAddress dan memvalidasinya
    const { batchId, batchRefId, senderAddress, quantity, unit, gpsCoordinates, notes } = body;

    // --- 2. VALIDASI INPUT ---
    // Memastikan senderAddress juga ada
    if (!batchId || !batchRefId || !quantity || !unit || !gpsCoordinates) {
      return jsonResponse({ success: false, message: "Missing required fields (Batch ID, Ref ID, Sender Address, Quantity, Unit, GPS)." }, 400);
    }

    // Pastikan quantity valid
    if (parseFloat(quantity) <= 0 || isNaN(parseFloat(quantity))) {
      return jsonResponse({ success: false, message: "Quantity must be a positive number." }, 400);
    }

    // --- 3. SIAPKAN PAYLOAD IPFS (Event RECEIVED) ---
    const ipfsPayload: ReceivedIpfsPayload = {
      batchId,
      eventType: RECEIVED_EVENT_TYPE,
      actorUserId, // Aktor yang menerima
      quantity,
      unit,
      location: gpsCoordinates,
      notes,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(ipfsPayload);
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("JSON IPFS upload failed");
    const ipfsHash = jsonIpfs.cid;

    // Diagram alur kerja Tracability (Diterima) 

    // --- 4. TRANSAKSI BLOCKCHAIN ---
    // Aktor yang bertransaksi adalah RECEIVER (actorUser.actorAddress)
    const txResult = await signAndSendTransaction(actorUser.actorAddress, batchId, ipfsHash, RECEIVED_EVENT_TYPE);

    // --- 5. PERBARUI DATABASE DALAM TRANSAKSI PRISMA ---
    const result = await prisma.$transaction(async (prisma) => {

      // a. Catat Event ke ProductEvent
      const productEvent = await prisma.productEvent.create({
        data: {
          batchId: batchId,
          batchRefId: batchRefId,
          eventType: RECEIVED_EVENT_TYPE, // Event Type 4
          ipfsHash: ipfsHash,
          actorAddress: actorUser!.actorAddress!, // Aktor yang menerima
          actorUserId: actorUserId,
          txHash: txResult.txHash,
          blockNumber: txResult.blockNumber,
          logIndex: txResult.logIndex,
          blockTimestamp: txResult.blockTimestamp,
        },
      });

      // b. Catat ke ShipmentLog
      await prisma.shipmentLog.create({
        data: {
          batchRefId: batchRefId,
          status: 'RECEIVED', // Status RECEIVED
          gpsCoordinates: gpsCoordinates,
          notes: notes,
          actorUserId: actorUserId,
          productEventId: productEvent.id,
          // Tambahan opsional: Jika skema ShipmentLog memiliki fromActorAddress
          // fromActorAddress: senderAddress, 
          // toActorAddress: actorUser!.actorAddress!,
        }
      });

      // // c. Update status Batch (Asumsi 'DELIVERED' adalah status setelah diterima)
      // await prisma.batch.update({
      //   where: { id: batchRefId },
      //   data: { status: 'DELIVERED' } // Diubah dari 'CONFIRMED' ke 'DELIVERED'
      // });


      return { productEventId: productEvent.id, txHash: txResult.txHash };
    });

    // --- 6. RESPONSE SUKSES ---
    return jsonResponse({
      success: true,
      message: "Received record submitted successfully.",
      eventId: result.productEventId,
      txHash: result.txHash,
    });

  } catch (err: any) {
    console.error("Received Record Error:", err);
    // Penanganan error JWT eksplisit
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return jsonResponse({ success: false, message: "Invalid or expired token." }, 401);
    }
    return jsonResponse({ success: false, message: err.message || "Internal Server Error" }, 500);
  }
}