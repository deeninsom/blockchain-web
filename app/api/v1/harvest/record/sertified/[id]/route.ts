import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { sendToBothNetworks } from "@/lib/blockchain/transaction";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || 'your_super_secret_fallback';
const EVENT_TYPE_VERIFICATION = 99;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: batchId } = await context.params;

  try {
    // 1. AUTHENTICATION
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

    // 2. CEK BATCH
    const existingBatch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!existingBatch) {
      return NextResponse.json({ success: false, message: "Pengajuan Sertifikasi tidak ditemukan." }, { status: 404 });
    }

    if (existingBatch.status === 'CONFIRMED') {
      return NextResponse.json({ success: false, message: "Batch sudah dikonfirmasi sebelumnya." }, { status: 400 });
    }

    // 3. CREATE DUMMY CERTIFICATE PAYLOAD KE IPFS (KARENA FILE FISIK DIHAPUS)
    const certPayload = JSON.stringify({ 
      message: "Sertifikasi disetujui otomatis oleh sistem", 
      batchId: existingBatch.batchId, 
      approvedBy: decoded.id 
    });
    
    const dummyCertIpfs = await uploadToIPFS(certPayload, false, 'application/json');
    if (!dummyCertIpfs?.cid) throw new Error("Gagal mengupload sertifikat sistem ke IPFS.");

    // 4. SIMPAN DATA KE DATABASE
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Default 1 year expiry

    const certificate = await prisma.certificate.create({
      data: {
        batchId: existingBatch.id,
        certName: "Sertifikat Sistem Otomatis",
        expiryDate: expiryDate,
        certHash: dummyCertIpfs.cid,
        issuedByUserId: decoded.id,
        notes: "Disetujui tanpa form verifikasi",
        categoryName: "Sertifikasi"
      }
    });

    const appEvent = await prisma.productEvent.findFirst({
      where: { batchRefId: existingBatch.id, eventType: 0 }
    });

    // 5. BLOCKCHAIN TRANSACTION
    const verificationPayload = {
      eventType: EVENT_TYPE_VERIFICATION,
      eventId: appEvent ? appEvent.id : "N/A",
      batchId: existingBatch.batchId,
      certificateId: certificate.id,
      certificateHash: dummyCertIpfs.cid,
      issuedByAddress: adminUser.actorAddress,
      issuedByUserId: decoded.id,
      timestamp: new Date().toISOString(),
    };

    const jsonIpfs = await uploadToIPFS(JSON.stringify(verificationPayload), false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("Gagal mengupload metadata ke IPFS.");

    const txResults = await sendToBothNetworks(
      adminUser.actorAddress,
      existingBatch.batchId,
      jsonIpfs.cid,
      EVENT_TYPE_VERIFICATION
    );

    // Update form to include txHash into certificate
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        txHash: txResults.map((t: any) => t.txHash).join(","),
      }
    });

    // 6. SIMPAN LOG BLOCKCHAIN & UPDATE STATUS
    const savedEvents = [];
    for (const tx of txResults) {
      const saved = await prisma.productEvent.create({
        data: {
          batchId: existingBatch.batchId,
          batchRefId: existingBatch.id,
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
      where: { id: existingBatch.id },
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
  }
}