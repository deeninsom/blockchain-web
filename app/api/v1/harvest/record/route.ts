import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Import formidable untuk parsing multipart/form-data dan TIPE data.
import * as formidable from 'formidable';
// Import tipe File dan Fields secara eksplisit untuk kejelasan
import type { File as FormidableFile, Fields as FormidableFields } from 'formidable';

// Mengatur runtime ke Node.js (Wajib saat menggunakan formidable)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Fungsi Pembantu untuk Parsing Formidable ---
/**
 * Menggunakan Formidable untuk mengurai request body mentah (stream Node.js)
 * dan mengembalikan fields dan files yang diurai.
 */
function parseForm(req: NextRequest): Promise<{ fields: FormidableFields; files: { [key: string]: FormidableFile | FormidableFile[] | undefined } }> {

  // Tentukan direktori upload sementara
  const tempUploadDir = path.join(process.cwd(), 'public', 'temp');

  // Pastikan direktori sementara ada sebelum Formidable mulai mengurai
  if (!existsSync(tempUploadDir)) {
    mkdirSync(tempUploadDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    // Formidable memerlukan request Node.js mentah
    const form = formidable.formidable({
      maxFileSize: 5 * 1024 * 1024, // Batas 5MB
      uploadDir: tempUploadDir, // Lokasi sementara yang sudah dipastikan ada
      keepExtensions: true,

      // Mengatur opsi untuk mengizinkan banyak file dengan nama yang sama 
      // (meskipun kita hanya berharap satu di sini)
      multiples: true,
    });

    // Formidable.parse memerlukan request Node.js. req as any adalah workaround untuk Next.js 16.0.3
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      // Memastikan tipe file dikembalikan sesuai yang diharapkan (Files adalah map<string, File | File[] | undefined>)
      resolve({ fields, files });
    });
  });
}


// --- HANDLER POST (UNTUK MENCATAT DATA BARU) ---
export async function POST(request: NextRequest) {
  let photoPath: string | null = null;
  let tempFilePath: string | null = null; // Menyimpan path file sementara

  try {
    // 1. Dapatkan Fields dan Files menggunakan Formidable
    const { fields, files } = await parseForm(request);

    // 2. Ekstraksi Data Teks dan File dari hasil parse
    // Pastikan untuk selalu mengambil elemen pertama dari array karena fields Formidable selalu array
    const batchId = Array.isArray(fields.batchId) ? fields.batchId[0] : fields.batchId;
    const location = Array.isArray(fields.location) ? fields.location[0] : fields.location;
    const harvestDateStr = Array.isArray(fields.harvestDate) ? fields.harvestDate[0] : fields.harvestDate;
    const quantityStr = Array.isArray(fields.quantity) ? fields.quantity[0] : fields.quantity;
    const unit = Array.isArray(fields.unit) ? fields.unit[0] : fields.unit;

    // Asumsi nama field file adalah 'photos'. Ambil elemen pertama dari array files.
    const photoFiles = files.photos;
    const photoFile = Array.isArray(photoFiles) ? photoFiles[0] : photoFiles;


    // 3. Validasi Dasar
    if (!batchId || !location || !harvestDateStr || !quantityStr || !unit || !photoFile) {
      return NextResponse.json({
        success: false,
        message: 'Semua field wajib diisi, termasuk foto.'
      }, { status: 400 });
    }

    // ... (Konversi Tipe Data seperti sebelumnya) ...
    const quantity = parseFloat(quantityStr);
    const harvestDate = new Date(harvestDateStr);

    if (isNaN(quantity) || isNaN(harvestDate.getTime())) {
      return NextResponse.json({
        success: false,
        message: 'Kuantitas atau Tanggal Panen tidak valid.'
      }, { status: 400 });
    }

    // 4. PINDAHKAN FILE DARI LOKASI SEMENTARA KE LOKASI PUBLIK

    // Tentukan jalur penyimpanan akhir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Mendapatkan nama file baru dan path tujuan
    const fileExtension = path.extname(photoFile.originalFilename || '.jpeg');
    const baseFileName = path.basename(photoFile.originalFilename || 'photo', fileExtension)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
    const fileName = `${baseFileName}-${Date.now()}${fileExtension}`;
    const targetFilePath = path.join(uploadDir, fileName);

    // Ambil path file sementara (dari Formidable)
    tempFilePath = photoFile.filepath;

    // Pindahkan file ke lokasi publik
    const fileContent = await readFile(tempFilePath);
    await writeFile(targetFilePath, fileContent);

    // Hapus file sementara setelah dipindahkan
    await unlink(tempFilePath);

    photoPath = `/uploads/${fileName}`;
    console.log(`Foto berhasil disimpan secara lokal: ${targetFilePath}`);


    // 5. SIMPAN DATA KE DATABASE MENGGUNAKAN PRISMA
    const newRecord = await prisma.harvestRecord.create({
      data: {
        batchId: batchId,
        location: location,
        harvestDate: harvestDate,
        quantity: quantity,
        unit: unit,
        photoUrl: photoPath,
      },
      select: {
        id: true,
        batchId: true,
        location: true,
        harvestDate: true,
        quantity: true,
        unit: true,
        photoUrl: true,
        createdAt: true,
      }
    });

    // 6. Respon Sukses
    return NextResponse.json({
      success: true,
      message: `Panen batch ${newRecord.batchId} berhasil dicatat.`,
      record: newRecord
    }, { status: 200 });

  } catch (error) {
    // Pastikan file sementara dihapus jika terjadi kegagalan
    // Gunakan try/catch di sini untuk memastikan unlink tidak menghentikan throw error utama
    if (tempFilePath && existsSync(tempFilePath)) {
      console.warn(`Menghapus file sementara yang gagal diunggah: ${tempFilePath}`);
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Gagal menghapus file sementara:', unlinkError);
      }
    }

    console.error('API Error (Catch Block):', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan internal saat memproses data. Cek log server.'
    }, { status: 500 });
  }
}


// --- HANDLER GET (TIDAK BERUBAH) ---
export async function GET() {
  try {
    const records = await prisma.harvestRecord.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        batchId: true,
        location: true,
        harvestDate: true,
        quantity: true,
        unit: true,
        photoUrl: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Data catatan panen berhasil diambil.",
      records: records
    }, { status: 200 });

  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data catatan panen.'
    }, { status: 500 });
  }
}