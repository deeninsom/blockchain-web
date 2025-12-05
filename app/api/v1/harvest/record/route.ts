import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const batchId = form.get("batchNumber")?.toString();
    const productName = form.get("productName")?.toString() ?? "Unknown";
    const harvestDate = form.get("harvestDate")?.toString();
    const location = form.get("location")?.toString() ?? "";
    const farmerId = form.get("farmerId")?.toString(); // user id in DB
    const photo = form.get("photo") as File | null;

    if (!batchId || !harvestDate || !photo) {
      return NextResponse.json({ success: false, message: `Missing fields ${batchId}${harvestDate}${farmerId}` }, { status: 400 });
    }

    // save temp
    const uploadDir = path.join(process.cwd(), "tmp", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname(photo.name) || ".jpg";
    const safeName = `${photo.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}-${Date.now()}${ext}`;
    const tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);

    // upload to IPFS
    const ipfs = await uploadToIPFS(tempPath);
    if (!ipfs?.cid) throw new Error("IPFS upload failed");

    console.log(ipfs)
    // create batch in DB
    const batch = await prisma.batch.create({
      data: {
        batchId,
        productName,
        harvestTime: new Date(harvestDate),
        location,
        photoIpfsHash: ipfs.cid,
        farmerId: '25a48fe0-43f6-49f0-94b9-8d47bdc5d36c',
      },
    });

    return NextResponse.json({ success: true, batch, ipfs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const all = await prisma.batch.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: all });
}
