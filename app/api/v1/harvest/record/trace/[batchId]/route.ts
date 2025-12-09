import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson"; // Asumsi: Fungsi ini dapat mengambil JSON dari IPFS hash

// --- KONFIGURASI DAN TIPE ---
export const dynamic = "force-dynamic";

const EVENT_TYPE_VERIFICATION = 99; // Kode yang Anda gunakan di backend POST /verify

// Tipe Data Hasil Akhir yang akan dikirim ke Frontend
interface TraceVerificationResult {
  isVerified: boolean;
  batchId: string;
  eventTimestamp: string;
  txHash: string | null;
  certName: string | null;
  expiryDate: string | null;
  notes: string | null;
  certificateFileHash: string | null;
  verifierAddress: string | null;
  status: string; // Status Batch
}

// Tipe Payload IPFS (dari POST /verify)
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  // 1. Ambil & Validasi Batch ID
  const batchId = (await (context.params)).batchId;

  if (!batchId) {
    return NextResponse.json(
      { success: false, message: "Parameter Batch ID wajib diisi di URL." },
      { status: 400 }
    );
  }

  const finalResult: TraceVerificationResult = {
    isVerified: false,
    batchId: batchId,
    eventTimestamp: 'N/A',
    txHash: null,
    certName: null,
    expiryDate: null,
    notes: null,
    certificateFileHash: null,
    verifierAddress: null,
    status: 'N/A'
  };

  try {
    // 2. Cari Event Verifikasi Terakhir (eventType = 99)
    const verificationEvent = await prisma.productEvent.findFirst({
      where: {
        batchId: batchId,
        eventType: EVENT_TYPE_VERIFICATION
      },
      orderBy: {
        blockTimestamp: 'desc' // Ambil event verifikasi yang terbaru
      },
      include: {
        batch: true
      }
    });

    // 3. Jika Event Verifikasi Ditemukan
    if (verificationEvent) {
      finalResult.isVerified = true;
      finalResult.txHash = verificationEvent.txHash;
      finalResult.eventTimestamp = verificationEvent.blockTimestamp?.toISOString() || verificationEvent.createdAt.toISOString();
      finalResult.verifierAddress = verificationEvent.actorAddress;
      finalResult.status = verificationEvent.batch?.status || 'UNKNOWN';

      // 4. Ambil Metadata Verifikasi dari IPFS
      const ipfsHash = verificationEvent.ipfsHash;

      // Asumsi getIpfsJson mengembalikan VerificationIpfsPayload
      // Kita menggunakan 'as' assertion di sini karena getIpfsJson tidak didefinisikan secara eksplisit
      const ipfsPayload = await getIpfsJson(ipfsHash) as VerificationIpfsPayload;

      if (!ipfsPayload || !ipfsPayload.certificateId) {
        // Event ditemukan di DB, tapi metadata IPFS gagal atau korup
        console.error(`IPFS payload missing or invalid for Batch ID: ${batchId}`);
        finalResult.certName = 'Metadata IPFS tidak lengkap/gagal dimuat.';

        return NextResponse.json({ success: true, data: finalResult }, { status: 200 });
      }

      // 5. Ambil Detail Sertifikat dari DB (menggunakan certificateId dari IPFS)
      const certificateDetail = await prisma.certificate.findUnique({
        where: { id: ipfsPayload.certificateId },
        // ✅ PERBAIKAN DITERAPKAN DI SINI
        include: { issuedBy: true }
      });

      if (certificateDetail) {
        // 6. Isi Data Validasi
        finalResult.certName = certificateDetail.certName;
        finalResult.expiryDate = certificateDetail.expiryDate.toISOString();
        finalResult.notes = certificateDetail.notes;

        // Hash file asli sertifikat (untuk ditampilkan atau diunduh)
        finalResult.certificateFileHash = certificateDetail.certHash;

        // Verifikasi silang (cross-check)
        if (certificateDetail.certHash !== ipfsPayload.certificateHash) {
          console.warn(`Hash file sertifikat di DB tidak cocok dengan IPFS payload untuk Batch ID: ${batchId}`);
        }
      } else {
        // Metadata sertifikat hilang dari DB (meskipun tercatat di IPFS/Blockchain)
        finalResult.certName = 'Detail Sertifikat (Off-chain) Hilang dari Database.';
      }
    } else {
      // Jika Event Verifikasi (99) tidak ditemukan sama sekali
      const batchStatus = await prisma.batch.findUnique({ where: { batchId } });
      finalResult.status = batchStatus?.status || 'NOT_FOUND';
      finalResult.isVerified = false;
    }

    // 7. Respon Sukses
    return NextResponse.json({ success: true, data: finalResult }, { status: 200 });

  } catch (error: any) {
    console.error("Trace Verification Error:", error);
    return NextResponse.json({ success: false, message: `Internal server error: ${error.message}` }, { status: 500 });
  }
}