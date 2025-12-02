import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const batchId = form.get("batchId")?.toString();
    const location = form.get("location")?.toString();
    const harvestDate = form.get("harvestDate")?.toString();
    const quantity = form.get("quantity")?.toString();
    const unit = form.get("unit")?.toString();
    const photo = form.get("photos") as File | null;

    if (!batchId || !location || !harvestDate || !quantity || !unit) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (!photo) {
      return NextResponse.json(
        { success: false, message: "Foto wajib diunggah" },
        { status: 400 }
      );
    }

    // --- Simpan Gambar ke public/uploads ---
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = path.extname(photo.name) || ".jpg";
    const safeName =
      photo.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20) +
      "-" +
      Date.now() +
      ext;

    const savePath = path.join(uploadDir, safeName);
    await writeFile(savePath, buffer);

    const photoUrl = `/uploads/${safeName}`;

    // --- Simpan ke DB ---
    const record = await prisma.harvestRecord.create({
      data: {
        batchId,
        location,
        harvestDate: new Date(harvestDate),
        quantity: parseFloat(quantity),
        unit,
        photoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data panen tersimpan",
      record,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Upload gagal", error: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const records = await prisma.harvestRecord.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    records,
  });
}
