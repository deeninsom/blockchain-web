import { NextResponse } from 'next/server';
import { PrismaClient, ValidationStatus } from '@prisma/client'; // Import Enum yang valid
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson";
import { Prisma } from '@prisma/client';

// Inisialisasi Prisma Client di luar handler untuk re-use
const prisma = new PrismaClient();

/**
 * @route GET /api/v1/logistic/record-shipment
 * @description Mengambil daftar batch yang statusnya saat ini 'PICKED' (Diambil) atau 
 * 'RECEIVED' (Diterima), menampilkan riwayat event lengkap.
 */
export async function GET(request: Request) {

  try {
    // PERBAIKAN: Menggunakan nilai ENUM dari Prisma Client
    const logisticStatuses = [
      ValidationStatus.CONFIRMED
    ];

    // 1. Cari Batch berdasarkan status logistik (PICKED atau RECEIVED)
    const batchesWithAllEvents = await prisma.batch.findMany({
      where: {
        // Filter utama: Hanya Batch yang statusnya saat ini adalah logistik
        status: {
          in: logisticStatuses, // Menggunakan Enum yang benar
        },
      },
      select: {
        id: true,
        batchId: true,
        productName: true,
        status: true,

        // Ambil SEMUA Event, diurutkan secara kronologis
        events: {
          orderBy: {
            blockTimestamp: 'asc' // Urutan waktu event dari awal
          },
          select: {
            eventType: true,
            ipfsHash: true,
            blockTimestamp: true,
            actorUser: {
              select: { name: true, role: true }
            }
          }
        },

        // Ambil ShipmentLog terakhir untuk ringkasan logistik
        shipmentLogs: {
          where: {
            // Catatan: Jika 'status' di ShipmentLog juga Enum, ganti string ini.
            // Namun, biasanya status di Log berupa String yang mereplikasi status Batch/Shipment
            status: {
              in: ['PICKED', 'RECEIVED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            status: true,
            createdAt: true,
            actorUser: {
              select: { name: true }
            }
          }
        }
      },
    });

    if (batchesWithAllEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada batch yang memiliki status logistik saat ini (PICKED/RECEIVED).",
        batches: [],
        total: 0
      }, { status: 200 });
    }

    // 2. Format Respons
    const formattedBatches = await Promise.all(batchesWithAllEvents.map(async (batch) => {
      const firstEvent = batch.events[0];
      const lastLogisticLog = batch.shipmentLogs[0];

      let ipfsData: any = {};
      if (firstEvent?.ipfsHash) {
        ipfsData = await getIpfsJson(firstEvent.ipfsHash);
      }

      const history = batch.events.map(event => ({
        eventType: event.eventType,
        actorName: event.actorUser?.name || 'Unknown',
        actorRole: event.actorUser?.role || 'N/A',
        timestamp: event.blockTimestamp,
        ipfsHash: event.ipfsHash,
      }));


      return {
        id: batch.id,
        batchId: ipfsData.batchId || batch.batchId,
        productName: ipfsData.productName || batch.productName,

        currentStatus: batch.status,
        lastLogisticStatus: lastLogisticLog?.status || 'N/A',
        lastLogisticBy: lastLogisticLog?.actorUser.name || 'Unknown',
        lastLogisticAt: lastLogisticLog?.createdAt,

        quantity: ipfsData.quantity || 'N/A',
        unit: ipfsData.unit || 'N/A',
        farmerName: firstEvent?.actorUser?.name || 'N/A',
        harvestDate: firstEvent?.blockTimestamp,
        dataIpfsHash: firstEvent?.ipfsHash,

        history: history,
      };
    }));


    return NextResponse.json({
      success: true,
      message: "Daftar batch dengan status logistik saat ini (PICKED/RECEIVED) dan event lengkap berhasil diambil.",
      batches: formattedBatches,
      total: formattedBatches.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error:", error);

    let errorMessage = "Internal Server Error";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Prisma Error (${error.code}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan server saat mengambil data logistik.",
      error: errorMessage
    }, { status: 500 });
  }
}