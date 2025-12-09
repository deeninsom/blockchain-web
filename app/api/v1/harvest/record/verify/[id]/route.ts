import { NextRequest, NextResponse } from 'next/server';
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { prisma } from '@/lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { signAndSendTransaction } from "@/lib/blockchain/transaction"; // 🟢 Import Fungsi Blockchain
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson"; // 🟢 Import Fungsi IPFS Json (jika ada)

// --- KONFIGURASI DAN TIPE ---
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';
const EVENT_TYPE_VERIFICATION = 99; // 🟢 Tentukan kode Event Type untuk Verifikasi

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

interface VerifiedFormData {
  success: true;
  certificateName: string;
  expiryDateStr: string;
  notes: string;
  certificateFile: File;
}

interface ErrorFormData {
  success: false;
  error: string;
  status: number;
}

// 🟢 Tipe Payload IPFS untuk Event Verifikasi
interface VerificationIpfsPayload {
  eventType: number;
  eventId: string;
  batchId: string;
  certificateId: string;
  certificateHash: string;
  issuedByAddress: string;
  issuedByUserId: string;
  timestamp: string;
}

// Helper untuk membaca FormData (Tidak berubah)
async function extractFormData(req: NextRequest): Promise<VerifiedFormData | ErrorFormData> {
  try {
    const formData = await req.formData();
    const certificateName = formData.get('certificateName');
    const expiryDateStr = formData.get('expiryDate');
    const notes = formData.get('notes');
    const certificateFile = formData.get('certificateFile');

    if (
      !certificateName || typeof certificateName !== 'string' ||
      !expiryDateStr || typeof expiryDateStr !== 'string' ||
      !certificateFile || !(certificateFile instanceof File)
    ) {
      return { success: false, error: 'Data verifikasi (Nama, Tanggal, File) wajib diisi dan harus valid.', status: 400 };
    }

    return {
      success: true,
      certificateName: certificateName as string,
      expiryDateStr: expiryDateStr as string,
      notes: (notes || '') as string,
      certificateFile: certificateFile as File
    };

  } catch (error) {
    console.error("Error reading form data:", error);
    return { success: false, error: 'Gagal memproses data formulir.', status: 500 };
  }
}


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const eventId = (await (context.params)).id;
  let tempPath: string | undefined;
  if (!eventId) {
    return NextResponse.json(
      { success: false, message: "Parameter ID Event (Harvest Record) wajib diisi di URL." },
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
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat memverifikasi." }, { status: 403 });
    }

    // Ambil Data Admin (Actor)
    const adminUser = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!adminUser || !adminUser.actorAddress) throw new Error("Admin wallet address not found.");
    const actorAddress = adminUser.actorAddress;


    const formData = await extractFormData(req);
    if (!formData.success) {
      return NextResponse.json({ success: false, message: formData.error }, { status: formData.status });
    }
    const { certificateName, expiryDateStr, notes, certificateFile } = formData;

    // --- 2. CEK EVENT DAN BATCH STATUS ---
    const existingEvent = await prisma.productEvent.findUnique({
      where: { id: eventId },
      include: { batch: true }
    });

    if (!existingEvent || existingEvent.eventType !== 1 || !existingEvent.batch) {
      return NextResponse.json({ success: false, message: "Record Harvest atau Batch terkait tidak ditemukan." }, { status: 404 });
    }

    if (existingEvent.batch.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: `Status batch sudah ${existingEvent.batch.status}. Verifikasi tidak dapat diulang.` }, { status: 400 });
    }

    const batchId = existingEvent.batch.batchId; // Batch ID unik dari SC/mobile


    // --- 3. PROSES DAN UPLOAD FILE SERTIFIKAT KE IPFS ---
    // (Kode upload file ke IPFS tidak berubah)
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await certificateFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = path.extname(certificateFile.name) || ".pdf";
    const safeName =
      certificateFile.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20) +
      "-VERIFY-" +
      Date.now() +
      ext;

    tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);

    const certificateIpfs = await uploadToIPFS(tempPath, true);
    if (!certificateIpfs?.cid) throw new Error("Certificate IPFS upload failed");
    const certificateFileHash = certificateIpfs.cid;


    // --- 4. SIMPAN METADATA SERTIFIKAT KE DB ---
    const certificate = await prisma.certificate.create({
      data: {
        batchId: existingEvent.batch.id, // ID Batch internal (UUID)
        certName: certificateName,
        expiryDate: new Date(expiryDateStr),
        certHash: certificateFileHash,
        issuedByUserId: actorUserId,
        notes: notes,
      }
    });


    // --- 5. BUAT & UPLOAD PAYLOAD VERIFIKASI KE IPFS (JSON) ---
    const verificationPayload: VerificationIpfsPayload = {
      eventType: EVENT_TYPE_VERIFICATION,
      eventId: existingEvent.id, // ID Event Harvest yang diverifikasi
      batchId: batchId, // Batch ID yang dicatat di SC
      certificateId: certificate.id, // ID Sertifikat internal
      certificateHash: certificateFileHash, // Hash file sertifikat
      issuedByAddress: actorAddress,
      issuedByUserId: actorUserId,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(verificationPayload);
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("Verification JSON IPFS upload failed");

    const ipfsHash = jsonIpfs.cid; // Hash IPFS yang akan dicatat di Blockchain


    // --- 6. KIRIM TRANSAKSI KE BLOCKCHAIN ---
    const txResult = await signAndSendTransaction(
      actorAddress,
      batchId, // Batch ID unik
      ipfsHash,
      EVENT_TYPE_VERIFICATION
    );

    // --- 7. CATAT EVENT BLOCKCHAIN BARU DI DB (ProductEvent) ---
    const productEvent = await prisma.productEvent.create({
      data: {
        batchId: batchId, // Batch ID unik
        batchRefId: existingEvent.batch.id, // ID Batch internal
        eventType: EVENT_TYPE_VERIFICATION,
        ipfsHash: ipfsHash,
        actorAddress: actorAddress,
        actorUserId: actorUserId,
        txHash: txResult.txHash,
        blockNumber: txResult.blockNumber,
        logIndex: txResult.logIndex,
        blockTimestamp: txResult.blockTimestamp,
      },
    });


    // --- 8. UPDATE STATUS BATCH MENJADI VERIFIED (dan CONFIRMED) ---
    // Status VERIFIED menandakan Admin setuju (Off-chain),
    // Status CONFIRMED menandakan sudah dicatat di Blockchain (On-chain).
    // Karena ini adalah event terakhir, kita langsung set CONFIRMED.
    const updatedBatch = await prisma.batch.update({
      where: { id: existingEvent.batch.id },
      data: {
        status: 'CONFIRMED', // Ganti menjadi CONFIRMED
        updatedAt: new Date(),
      }
    });

    // --- 9. RESPONS SUKSES ---
    return NextResponse.json({
      success: true,
      message: "Verifikasi berhasil. Event tercatat di Blockchain.",
      certificateId: certificate.id,
      txHash: txResult.txHash, // Berikan Hash Transaksi Verifikasi
      eventId: productEvent.id, // ID Event Verifikasi yang baru
      batchStatus: updatedBatch.status
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification POST Error:", error);
    return NextResponse.json({ success: false, message: `Internal server error: ${error.message}` }, { status: 500 });
  } finally {
    // --- 10. CLEANUP FILE SEMENTARA ---
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch (cleanupErr) {
        console.error("Failed to clean up temp file:", cleanupErr);
      }
    }
  }
}