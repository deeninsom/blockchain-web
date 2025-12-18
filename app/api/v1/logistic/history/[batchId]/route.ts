import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @route GET /api/v1/logistic/tracking/[batchId]
 * @description Mengambil semua riwayat event on-chain (ProductEvent & ShipmentLog) 
 * untuk Batch ID internal tertentu, diurutkan berdasarkan waktu.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ batchId: string }> }
) {
  const batchId = (await (context.params)).batchId;

  if (!batchId) {
    return NextResponse.json({
      success: false,
      message: "Batch ID harus disediakan."
    }, { status: 400 });
  }

  try {
    // 1. Cari Batch dan semua relasi tracking yang relevan
    const batch = await prisma.batch.findFirst({
      where: {
        OR: [
          { id: batchId },       // Mencari berdasarkan ID asli (Primary Key)
          { batchId: batchId }   // Mencari berdasarkan string Batch ID (HRV-...)
        ]
      },
      include: {
        // Ambil semua ProductEvent terkait dengan Batch
        events: {
          include: {
            actorUser: {
              select: { role: true, name: true } // Ambil Role dan Nama Aktor
            },
            // Sertakan ShipmentLog jika ProductEvent ini adalah logistik (PICKED/RECEIVED)
            shipmentLog: true
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({
        success: false,
        message: `Batch dengan ID internal ${batchId} tidak ditemukan.`
      }, { status: 404 });
    }

    // 2. Format Data Event untuk Client
    const formattedEvents = batch.events
      .map(event => {
        let locationName = "Pencatatan Awal Produk";
        let description = `Event on-chain dicatat oleh ${event.actorUser?.name || 'Sistem'}.`;
        let gpsCoordinates = null;
        let notes = null;
        let eventTypeDisplay: string;

        // Tentukan lokasi dan deskripsi berdasarkan eventType (sesuaikan dengan enum Anda)
        if (event.shipmentLog) {
          // Logistik Event (PICKED/RECEIVED)
          const log = event.shipmentLog;
          const status = log.status;
          eventTypeDisplay = status;

          locationName = status === 'PICKED'
            ? `Dimuat/Diambil (PICKED)`
            : `Diterima (RECEIVED)`;

          description = `Transaksi Logistik: ${status} oleh ${event.actorUser?.name || 'Operator'}.`;
          gpsCoordinates = log.gpsCoordinates;
          notes = log.notes;

        } else if (event.eventType === 1) { // Asumsi 1 = HARVEST
          eventTypeDisplay = "HARVEST";
          locationName = `Panen Awal/Sumber`;
          description = `Pencatatan data panen awal (IPFS Hash: ${event.ipfsHash}).`;

        } else if (event.eventType === 2) { // Asumsi 2 = VERIFIED/CERTIFIED
          eventTypeDisplay = "VERIFIED";
          locationName = `Verifikasi Admin`;
          description = `Sertifikat Kualitas dikeluarkan.`;
        } else {
          eventTypeDisplay = `Event Type ${event.eventType}`;
        }

        return {
          id: event.id,
          txHash: event.txHash,
          ipfsHash: event.ipfsHash,
          blockTimestamp: event.blockTimestamp.toISOString(),
          locationName: locationName,
          description: description,
          eventType: event.eventType, // eventType numerik (1, 2, 3, 5, dst.)
          actorRole: event.actorUser?.role || 'SYSTEM',
          gpsCoordinates: gpsCoordinates,
          notes: notes
        };
      })
      // Urutkan ulang berdasarkan blockTimestamp secara kronologis (asc)
      .sort((a, b) => new Date(a.blockTimestamp).getTime() - new Date(b.blockTimestamp).getTime());

    // 3. Sertakan metadata Batch
    return NextResponse.json({
      success: true,
      batchId: batch.batchId,
      productName: batch.productName,
      events: formattedEvents,
    });

  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json({
      success: false,
      message: "Gagal memuat detail tracking. Periksa relasi ProductEvent dan ShipmentLog."
    }, { status: 500 });
  }
}