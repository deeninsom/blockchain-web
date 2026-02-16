import { NextRequest, NextResponse } from 'next/server';
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { sendToBothNetworks } from "@/lib/blockchain/transaction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';
const EVENT_TYPE_VERIFICATION = 99;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // 1. AMBIL FORM DATA SEGERA (Paling Atas)
  // Ini mencegah error "body is disturbed or locked" atau "expected boundary"
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("Multipart Parse Error:", err);
    return NextResponse.json({ success: false, message: "Gagal membaca data formulir. Pastikan file tidak terlalu besar." }, { status: 400 });
  }

  const { id: eventId } = await context.params;
  let tempPath: string | undefined;

  try {
    // 2. EKSTRAKSI DATA DARI FORM (Sudah di memori)
    const certificateName = formData.get('certificateName') as string;
    const expiryDateStr = formData.get('expiryDate') as string;
    const notes = (formData.get('notes') || '') as string;
    const categoryName = (formData.get('categoryName') || '') as string;
    const certificateFile = formData.get('certificateFile') as File;

    if (!certificateName || !expiryDateStr || !certificateFile || !(certificateFile instanceof File)) {
      return NextResponse.json({ success: false, message: "Nama, Tanggal, dan File Sertifikat wajib diisi." }, { status: 400 });
    }

    // 3. AUTHENTICATION (Setelah body aman)
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid token." }, { status: 401 });
    }

    if (decoded.role !== 'ADMIN') return NextResponse.json({ success: false, message: "Akses ditolak." }, { status: 403 });

    const adminUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!adminUser?.actorAddress) throw new Error("Wallet admin tidak terdaftar.");

    // 4. CEK EVENT & BATCH
    const existingEvent = await prisma.productEvent.findUnique({
      where: { id: eventId },
      include: { batch: true }
    });

    if (!existingEvent || !existingEvent.batch) {
      return NextResponse.json({ success: false, message: "Data panen tidak ditemukan." }, { status: 404 });
    }

    if (existingEvent.batch.status === 'CONFIRMED') {
      return NextResponse.json({ success: false, message: "Batch sudah dikonfirmasi sebelumnya." }, { status: 400 });
    }

    // 5. PROSES FILE & UPLOAD IPFS
    const buffer = Buffer.from(await certificateFile.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const safeName = `CERT-${Date.now()}-${certificateFile.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);

    const certificateIpfs = await uploadToIPFS(tempPath, true);
    if (!certificateIpfs?.cid) throw new Error("Gagal mengupload file ke IPFS.");

    // 6. SIMPAN DATA KE DATABASE
    const certificate = await prisma.certificate.create({
      data: {
        batchId: existingEvent.batch.id,
        certName: certificateName,
        expiryDate: new Date(expiryDateStr),
        certHash: certificateIpfs.cid,
        issuedByUserId: decoded.id,
        notes,
        categoryName
      }
    });

    // 7. BLOCKCHAIN TRANSACTION
    const verificationPayload = {
      eventType: EVENT_TYPE_VERIFICATION,
      eventId: existingEvent.id,
      batchId: existingEvent.batch.batchId,
      certificateId: certificate.id,
      certificateHash: certificateIpfs.cid,
      issuedByAddress: adminUser.actorAddress,
      issuedByUserId: decoded.id,
      timestamp: new Date().toISOString(),
    };

    const jsonIpfs = await uploadToIPFS(JSON.stringify(verificationPayload), false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("Gagal mengupload metadata ke IPFS.");

    const txResults = await sendToBothNetworks(
      adminUser.actorAddress,
      existingEvent.batch.batchId,
      jsonIpfs.cid,
      EVENT_TYPE_VERIFICATION
    );

    // 8. SIMPAN LOG BLOCKCHAIN & UPDATE STATUS
    const savedEvents = [];
    for (const tx of txResults) {
      const saved = await prisma.productEvent.create({
        data: {
          batchId: existingEvent.batch.batchId,
          batchRefId: existingEvent.batch.id,
          eventType: EVENT_TYPE_VERIFICATION,
          ipfsHash: jsonIpfs.cid,
          chainType: tx.network.includes("Sepolia") ? "SEPOLIA" : "AMOY",
          actorAddress: adminUser.actorAddress,
          actorUserId: decoded.id,
          txHash: tx.txHash,
          blockNumber: Number(tx.blockNumber),
          logIndex: tx.logIndex ?? 0,
          blockTimestamp: tx.blockTimestamp,
        },
      });
      savedEvents.push({ network: tx.network, txHash: tx.txHash });
    }

    await prisma.batch.update({
      where: { id: existingEvent.batch.id },
      data: { status: 'CONFIRMED' },
    });

    return NextResponse.json({
      success: true,
      message: "Verifikasi berhasil dicatat ke Blockchain.",
      events: savedEvents
    }, { status: 200 });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
  } finally {
    if (tempPath) {
      try { await unlink(tempPath); } catch (e) { }
    }
  }
}