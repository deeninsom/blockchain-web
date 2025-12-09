// app/api/qr/batch/[batchId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

// 🛑 KONSTANTA: Definisikan URL dasar untuk traceability konsumen.
// Gunakan fallback URL jika NEXT_PUBLIC_TRACE_URL tidak disetel.
const BASE_TRACE_URL = process.env.NEXT_PUBLIC_TRACE_URL

/**
 * Route Handler untuk request GET.
 * Menghasilkan gambar QR Code berdasarkan batchId.
 * @param {NextRequest} request - Objek request masuk.
 * @param {object} context - Konteks yang berisi parameter dinamis.
 * @returns {NextResponse} - Respon dengan gambar PNG atau error.
 */
export async function GET(
  request: NextRequest,
  // 🛑 PERBAIKAN 1: context.params adalah objek langsung
  context: { params: Promise<{ batchId: string }> }
) {
  // 🛑 PERBAIKAN 2: Destructure langsung (dan perbaikan typo batchId)
  const batchId = (await (context.params)).batchId;
  console.log(batchId)
  if (!batchId) {
    // Sebenarnya ini tidak akan tercapai karena router akan menolak jika [batchId] kosong,
    // tapi ini adalah validasi yang baik.
    return NextResponse.json(
      { message: "Batch ID diperlukan." },
      { status: 400 }
    );
  }

  try {
    // 1. Definisikan data yang akan di-encode dalam QR Code
    const traceabilityUrl = `${BASE_TRACE_URL}?batchId=${batchId}`;

    // 2. Konversi string data menjadi buffer gambar PNG
    const qrCodeBuffer = await QRCode.toBuffer(traceabilityUrl, {
      type: 'png',
      errorCorrectionLevel: 'H',
      width: 256,
      margin: 1,
    });

    // 3. Buat response dengan header Content-Type yang sesuai (image/png)
    // 🛑 PERBAIKAN 3: Wrap Node.js Buffer dengan Buffer bawaan Next/Node.js jika perlu
    // Meskipun NextResponse.json() tidak mendukung body Buffer, NextResponse() mendukungnya.
    // Kita menggunakan `Buffer.from(qrCodeBuffer)` untuk memastikan type yang tepat.
    const response = new NextResponse(Buffer.from(qrCodeBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return response;

  } catch (error) {
    console.error("Error generating QR code:", error);

    return NextResponse.json(
      { message: "Gagal menghasilkan QR Code." },
      { status: 500 }
    );
  }
}