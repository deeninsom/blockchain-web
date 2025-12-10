import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Inisialisasi Prisma Client di luar handler untuk re-use
const prisma = new PrismaClient();

/**
 * @route GET /api/v1/logistic/record-shipment
 * @description Mengambil daftar batch yang statusnya sudah 'PICKED' (Diambil) dan 
 * belum 'RECEIVED' (Diterima), siap untuk dicatat sebagai pengiriman selanjutnya.
 */
export async function GET(request: Request) {
  // Memastikan hanya peran LOGISTIC yang dapat mengakses
  // (Implementasi autentikasi & otorisasi diabaikan di sini, tetapi penting)

  try {
    // 1. Dapatkan daftar ID Batch yang sudah pernah memiliki log PICKED
    //    Ini memastikan kita hanya fokus pada batch yang sudah 'diambil'.
    const pickedBatchIds = await prisma.shipmentLog.findMany({
      where: {
        status: 'PICKED'
      },
      select: {
        batchRefId: true,
      },
      distinct: ['batchRefId'],
    });

    const batchIds = pickedBatchIds.map(log => log.batchRefId);

    if (batchIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada batch yang berstatus PICKED saat ini.",
        batches: [],
        total: 0
      }, { status: 200 });
    }

    // 2. Cari Batch yang memiliki log PICKED tetapi TIDAK memiliki log RECEIVED
    //    (Ini menandakan batch sedang dalam transit/siap untuk proses pengiriman selanjutnya)

    const batches = await prisma.batch.findMany({
      where: {
        id: {
          in: batchIds, // Hanya ambil yang sudah pernah di-PICKED
        },
        shipmentLogs: {
          none: {
            // Pastikan tidak ada log dengan status RECEIVED untuk batch ini
            status: 'RECEIVED'
          }
        }
      },
      select: {
        id: true,
        batchId: true,
        productName: true,
        // Kita juga bisa mengambil data Event Panen awal jika diperlukan
        events: {
          where: {
            // ASUMSI: Event Panen adalah eventType tertentu (misal: 1)
            // Karena skema tidak mendefinisikan eventType, kita ambil data pertama saja
            eventType: {
              // Jika Anda punya EventType khusus untuk panen, gunakan itu.
              // Contoh: in: [100] // ID Event Panen
            }
          },
          orderBy: {
            blockTimestamp: 'asc' // Ambil event terlama (biasanya Harvest/Panen)
          },
          take: 1, // Ambil hanya data panen awal
          select: {
            ipfsHash: true, // Berisi detail data panen (Lokasi, Quantity, dll)
            blockTimestamp: true,
            actorUser: {
              select: { name: true }
            }
          }
        },
        // Ambil ShipmentLog terakhir untuk melihat kapan di-PICKED
        shipmentLogs: {
          where: {
            status: 'PICKED'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            createdAt: true,
            actorUser: {
              select: { name: true }
            }
          }
        }
      },
    });

    // 3. Format Respons
    const formattedBatches = batches.map(batch => {
      const harvestEvent = batch.events[0];
      const lastPickedLog = batch.shipmentLogs[0];

      // NOTE: Dalam aplikasi nyata, Anda mungkin perlu mengambil data 
      // Quantity dan Unit dari IPFS menggunakan `harvestEvent.ipfsHash`.

      return {
        id: batch.id,
        batchId: batch.batchId,
        productName: batch.productName,
        // Simulasi data yang hilang, seharusnya diambil dari IPFS
        // quantity: "N/A", 
        // unit: "N/A", 

        // Data Logistik
        status: "PICKED",
        pickedBy: lastPickedLog?.actorUser.name || 'Unknown',
        pickedAt: lastPickedLog?.createdAt,

        // Data Panen Awal
        farmerName: harvestEvent?.actorUser?.name || 'N/A',
        harvestDate: harvestEvent?.blockTimestamp,

        // Hash yang dapat digunakan untuk mendapatkan detail data
        dataIpfsHash: harvestEvent?.ipfsHash,
      };
    });


    return NextResponse.json({
      success: true,
      message: "Daftar batch yang siap dicatat pengiriman berhasil diambil.",
      batches: formattedBatches,
      total: formattedBatches.length
    }, { status: 200 });

  } catch (error) {
    console.error("Prisma Error:", error);

    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan server saat mengambil data batch.",
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}