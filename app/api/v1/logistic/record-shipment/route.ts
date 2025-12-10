// app/api/logistics/record-shipment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Sesuaikan path prisma Anda
import { signAndSendTransaction } from '@/lib/blockchain/transaction'; // Asumsi helper signAndSendTransaction Anda
import jwt, { JwtPayload } from 'jsonwebtoken';
import { unlink } from 'fs/promises'; // Tidak diperlukan di sini, tapi referensi
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
// --- Konstanta & Types ---

// Ganti dengan secret key dan tipe payload JWT Anda yang sebenarnya
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
interface CustomJwtPayload extends JwtPayload { id: string; }

// Tipe Payload yang dikirim oleh aplikasi Operator Logistik
interface LogisticsPayload {
  batchId: string;
  status: 'PICKED' | 'RECEIVED'; // Status logistik yang diperbolehkan
  gpsCoordinates: string; // Wajib
  notes?: string; // Opsional
}

// Event Type untuk Smart Contract (Harus sesuai dengan kontrak Solidity Anda)
const EVENT_TYPE_PICKED = 3;
const EVENT_TYPE_RECEIVED = 5;

// --- Helper untuk Konversi Status ---
function getEventType(status: string): number {
  switch (status) {
    case "PICKED":
      return EVENT_TYPE_PICKED;
    case "RECEIVED":
      return EVENT_TYPE_RECEIVED;
    default:
      throw new Error(`Status ${status} tidak valid untuk logistik.`);
  }
}

// --- Handler Utama ---

export async function POST(req: NextRequest) {
  let logData: LogisticsPayload;

  try {
    // --- 1. OTENTIKASI AKTOR (OPERATOR) ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    if (!actorUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized or Invalid User." }, { status: 403 });
    }

    // --- 2. VALIDASI PAYLOAD ---
    // Asumsi payload Logistik dikirim sebagai JSON (bukan FormData seperti Harvest)
    logData = await req.json();

    const { batchId, status, gpsCoordinates, notes } = logData;

    if (!batchId || !status || !gpsCoordinates) {
      return NextResponse.json({ success: false, message: "Batch ID, Status, dan GPS wajib diisi." }, { status: 400 });
    }

    // --- 3. VALIDASI USER & BATCH ---
    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, actorAddress: true, role: true }
    });
    if (!user || !user.actorAddress) throw new Error("Actor wallet address not found or invalid user.");

    // Validasi Role (Optional, tapi disarankan)
    if (!['FARMER', 'CENTRAL_OPERATOR', 'RETAIL_OPERATOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: "User role not permitted for logistics recording." }, { status: 403 });
    }

    const batch = await prisma.batch.findUnique({ where: { batchId: batchId } });
    if (!batch) {
      return NextResponse.json({ success: false, message: `Batch ID ${batchId} tidak ditemukan.` }, { status: 404 });
    }

    const eventType = getEventType(status);


    // --- 4. IPFS UPLOAD JSON PAYLOAD ---
    const ipfsPayload = {
      batchId,
      eventType,
      actorId: actorUserId,
      status,
      gpsCoordinates,
      notes,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(ipfsPayload);
    // Menggunakan uploadToIPFS(data, isFilePath=false, mimeType)
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("JSON IPFS upload failed");

    const ipfsHash = jsonIpfs.cid;


    // --- 5. TRANSAKSI BLOCKCHAIN ---
    // signAndSendTransaction(actorAddress, batchId (string), ipfsHash, eventType)
    const txResult = await signAndSendTransaction(user.actorAddress, batch.batchId, ipfsHash, eventType);


    // --- 6. PENYIMPANAN DATABASE (Off-Chain) ---

    // A. ProductEvent (Bukti On-Chain)
    const productEvent = await prisma.productEvent.create({
      data: {
        batchId: batch.batchId,
        batchRefId: batch.id,
        eventType: eventType,
        ipfsHash: ipfsHash,
        actorAddress: user.actorAddress,
        actorUserId: user.id,
        txHash: txResult.txHash,
        blockNumber: txResult.blockNumber,
        logIndex: txResult.logIndex,
        blockTimestamp: txResult.blockTimestamp,
      },
    });

    // B. ShipmentLog (Detail Logistik dan Tautan ke ProductEvent)
    const shipmentLog = await prisma.shipmentLog.create({
      data: {
        batchRefId: batch.id,
        status: status,
        gpsCoordinates: gpsCoordinates,
        notes: notes,
        actorUserId: user.id,
        productEventId: productEvent.id, // Kunci unik One-to-One
      },
    });

    // --- 7. RESPON SUKSES ---
    return NextResponse.json({
      success: true,
      message: `Shipment recorded successfully as ${status}.`,
      logId: shipmentLog.id,
      txHash: txResult.txHash,
    }, { status: 200 });

  } catch (err: any) {
    console.error("Logistics Record Error:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}