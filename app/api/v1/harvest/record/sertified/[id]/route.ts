import { NextRequest, NextResponse } from 'next/server';
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { prisma } from '@/lib/prisma';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { sendToBothNetworks } from "@/lib/blockchain/transaction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';
const EVENT_TYPE_VERIFICATION = 99;

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

interface VerifiedFormData {
  success: true;
  certificateName: string;
  expiryDateStr: string;
  notes: string;
  categoryName: string;
  certificateFile: File;
}

interface ErrorFormData {
  success: false;
  error: string;
  status: number;
}

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

async function extractFormData(req: NextRequest): Promise<VerifiedFormData | ErrorFormData> {
  try {
    const formData = await req.formData();
    const certificateName = formData.get('certificateName');
    const expiryDateStr = formData.get('expiryDate');
    const notes = formData.get('notes');
    const categoryName = formData.get('categoryName');
    const certificateFile = formData.get('certificateFile');

    if (!certificateName || typeof certificateName !== 'string' ||
      !expiryDateStr || typeof expiryDateStr !== 'string' ||
      !certificateFile || !(certificateFile instanceof File)) {
      return { success: false, error: 'Data verifikasi (Nama, Tanggal, File) wajib diisi dan valid.', status: 400 };
    }

    return {
      success: true,
      certificateName,
      expiryDateStr,
      notes: (notes || '') as string,
      categoryName: (categoryName || '') as string,
      certificateFile
    };
  } catch (error) {
    console.error("Error reading form data:", error);
    return { success: false, error: 'Gagal memproses data formulir.', status: 500 };
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const eventId = (await context.params).id;
  let tempPath: string | undefined;

  if (!eventId) {
    return NextResponse.json({ success: false, message: "Parameter ID Event wajib diisi di URL." }, { status: 400 });
  }

  try {
    // --- 1. AUTH ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });

    let decoded: CustomJwtPayload;
    try { decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload; }
    catch { return NextResponse.json({ success: false, message: "Invalid token." }, { status: 401 }); }

    if (decoded.role !== 'ADMIN') return NextResponse.json({ success: false, message: "Hanya Admin yang dapat memverifikasi." }, { status: 403 });
    if (!decoded.id) throw new Error("User ID is missing from token.");

    const adminUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!adminUser?.actorAddress) throw new Error("Admin wallet address not found.");
    const actorAddress = adminUser.actorAddress;

    // --- 2. FORM DATA ---
    const formData = await extractFormData(req);
    if (!formData.success) return NextResponse.json({ success: false, message: formData.error }, { status: formData.status });
    const { certificateName, expiryDateStr, notes, certificateFile, categoryName } = formData;

    // --- 3. CEK EVENT & BATCH ---
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
    const batchId = existingEvent.batch.batchId;

    // --- 4. UPLOAD FILE KE IPFS ---
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // simpan sementara file ke disk
    const buffer = Buffer.from(await certificateFile.arrayBuffer());
    const ext = path.extname(certificateFile.name) || ".pdf";
    const safeName = certificateFile.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20) + "-VERIFY-" + Date.now() + ext;
    tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);

    // upload ke IPFS
    const certificateIpfs = await uploadToIPFS(tempPath, true);
    if (!certificateIpfs?.cid) throw new Error("Certificate IPFS upload failed");
    const certificateFileHash = certificateIpfs.cid;

    // --- 5. SIMPAN METADATA ---
    const certificate = await prisma.certificate.create({
      data: {
        batchId: existingEvent.batch.id,
        certName: certificateName,
        expiryDate: new Date(expiryDateStr),
        certHash: certificateFileHash,
        issuedByUserId: decoded.id,
        notes,
        categoryName
      }
    });

    // --- 6. UPLOAD VERIFICATION JSON ---
    const verificationPayload: VerificationIpfsPayload = {
      eventType: EVENT_TYPE_VERIFICATION,
      eventId: existingEvent.id,
      batchId,
      certificateId: certificate.id,
      certificateHash: certificateFileHash,
      issuedByAddress: actorAddress,
      issuedByUserId: decoded.id,
      timestamp: new Date().toISOString(),
    };
    const jsonIpfs = await uploadToIPFS(JSON.stringify(verificationPayload), false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("Verification JSON IPFS upload failed");
    const ipfsHash = jsonIpfs.cid;

    // --- 7. KIRIM TRANSAKSI ---
    const txResults = await sendToBothNetworks(actorAddress, batchId, ipfsHash, EVENT_TYPE_VERIFICATION);
    if (txResults.length === 0) throw new Error("Transaksi gagal dikirim ke semua network.");

    const savedEvents = [];
    for (const tx of txResults) {
      const saved = await prisma.productEvent.create({
        data: {
          batchId,
          batchRefId: existingEvent.batch.id,
          eventType: EVENT_TYPE_VERIFICATION,
          ipfsHash,
          chainType: tx.network === "Ethereum Sepolia" ? "SEPOLIA" : "AMOY",
          actorAddress,
          actorUserId: decoded.id,
          txHash: tx.txHash,
          blockNumber: Number(tx.blockNumber),
          logIndex: tx.logIndex ?? 0,
          blockTimestamp: tx.blockTimestamp,
        },
      });
      savedEvents.push({ network: tx.network, txHash: tx.txHash, eventId: saved.id });
    }

    // --- 8. UPDATE STATUS BATCH ---
    const updatedBatch = await prisma.batch.update({
      where: { id: existingEvent.batch.id },
      data: { status: 'CONFIRMED', updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Verifikasi berhasil. Event tercatat di Blockchain.",
      certificateId: certificate.id,
      events: savedEvents,
      batchStatus: updatedBatch.status
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification POST Error:", error);
    return NextResponse.json({ success: false, message: `Internal server error: ${error.message}` }, { status: 500 });
  } finally {
    if (tempPath) {
      try { await unlink(tempPath); }
      catch (cleanupErr) { console.error("Failed to clean up temp file:", cleanupErr); }
    }
  }
}
