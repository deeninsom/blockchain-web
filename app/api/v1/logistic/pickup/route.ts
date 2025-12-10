// app/api/v1/logistic/pickup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { signAndSendTransaction } from "@/lib/blockchain/transaction";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";
const PICKED_EVENT_TYPE = 3;

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

// Tipe untuk Aktor yang diambil dari Prisma (Untuk menghindari 'any' pada actorUser)
type PrismaUser = {
  id: string;
  actorAddress: string | null;
  // Tambahkan field lain yang Anda butuhkan (misal: name, email)
};

// Payload yang akan disimpan ke IPFS untuk Event PICKED
interface PickupIpfsPayload {
  batchId: string;
  eventType: number;
  actorUserId: string;
  quantity: string;
  unit: string;
  location: string;
  notes: string;
  timestamp: string;
}

interface PickupRequestBody {
  batchId: string;
  batchRefId: string;
  farmerAddress: string;
  quantity: string;
  unit: string;
  gpsCoordinates: string;
  notes: string;
}

/**
 * Endpoint POST untuk mencatat transaksi Pickup (Event Type 3).
 * URL: /api/v1/logistic/pickup
 */
export async function POST(req: NextRequest) {
  // Perbaikan: Deklarasikan actorUser dengan tipe yang sesuai, atau biarkan null/undefined
  let actorUser: PrismaUser | null = null;

  try {
    // --- 1. OTORISASI ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return jsonResponse({ success: false, message: "Authentication required." }, 401);
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;

    if (!actorUserId || (decoded.role !== 'RETAIL_OPERATOR' && decoded.role !== 'CENTRAL_OPERATOR')) {
      return jsonResponse({ success: false, message: "Unauthorized role or invalid user." }, 403);
    }

    // Ambil User Aktor (Operator/Logistik) untuk mendapatkan Address wallet
    // Pastikan menggunakan select/include yang sesuai dengan tipe PrismaUser yang didefinisikan
    actorUser = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, actorAddress: true } // Hanya ambil field yang dibutuhkan
    });

    // Cek Ketersediaan Wallet Aktor
    if (!actorUser || !actorUser.actorAddress) throw new Error("Operator wallet address not found or not registered.");

    const body: PickupRequestBody = await req.json();
    const { batchId, batchRefId, farmerAddress, quantity, unit, gpsCoordinates, notes } = body;

    // --- 2. VALIDASI INPUT ---
    if (!batchId || !batchRefId || !quantity || !unit || !gpsCoordinates) {
      return jsonResponse({ success: false, message: "Missing required fields (Batch ID, Ref ID, Quantity, Unit, GPS)." }, 400);
    }

    // Pastikan quantity valid (walaupun string, harus bisa di-parse)
    if (parseFloat(quantity) <= 0 || isNaN(parseFloat(quantity))) {
      return jsonResponse({ success: false, message: "Quantity must be a positive number." }, 400);
    }

    // --- 3. SIAPKAN PAYLOAD IPFS (Event PICKED) ---
    const ipfsPayload: PickupIpfsPayload = {
      batchId,
      eventType: PICKED_EVENT_TYPE,
      actorUserId,
      quantity,
      unit,
      location: gpsCoordinates, // Simpan GPS di payload utama IPFS
      notes,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(ipfsPayload);
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("JSON IPFS upload failed");
    const ipfsHash = jsonIpfs.cid;

    // Diagram alur kerja Tracability
    // 

    // --- 4. TRANSAKSI BLOCKCHAIN ---
    // Aktor yang bertransaksi adalah OPERATOR/LOGISTIK (actorUser.actorAddress)
    const txResult = await signAndSendTransaction(actorUser.actorAddress, batchId, ipfsHash, PICKED_EVENT_TYPE);

    // --- 5. PERBARUI DATABASE DALAM TRANSAKSI PRISMA ---
    const result = await prisma.$transaction(async (prisma) => {

      // a. Catat Event ke ProductEvent
      const productEvent = await prisma.productEvent.create({
        data: {
          batchId: batchId,
          batchRefId: batchRefId,
          eventType: PICKED_EVENT_TYPE,
          ipfsHash: ipfsHash,
          actorAddress: actorUser!.actorAddress!, // Tanda seru karena sudah dijamin tidak null di atas
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
          status: 'PICKED',
          gpsCoordinates: gpsCoordinates,
          notes: notes,
          actorUserId: actorUserId,
          productEventId: productEvent.id,
        }
      });

      // c. Update status Batch 
      await prisma.batch.update({
        where: { id: batchRefId },
        data: { status: 'CONFIRMED' }
      });


      return { productEventId: productEvent.id, txHash: txResult.txHash };
    });

    // --- 6. RESPONSE SUKSES ---
    return jsonResponse({
      success: true,
      message: "Pickup record submitted successfully.",
      eventId: result.productEventId,
      txHash: result.txHash,
    });

  } catch (err: any) {
    console.error("Pickup Record Error:", err);
    // Penanganan error JWT eksplisit
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return jsonResponse({ success: false, message: "Invalid or expired token." }, 401);
    }
    return jsonResponse({ success: false, message: err.message || "Internal Server Error" }, 500);
  }
}