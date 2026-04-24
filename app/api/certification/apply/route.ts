import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  let tempPath: string | undefined;

  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return jsonResponse({ success: false, message: "Authentication required." }, 401);
    }

    let decoded: CustomJwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    } catch {
      return jsonResponse({ success: false, message: "Invalid token." }, 401);
    }

    const actorUserId = decoded.id;
    if (!actorUserId || decoded.role !== 'FARMER') {
      return jsonResponse({ success: false, message: "Unauthorized: Hanya Petani." }, 403);
    }

    const form = await req.formData();
    const batchId = form.get("batchId")?.toString();
    const documentFile = form.get("document") as File | null;

    if (!batchId || !documentFile) {
      return jsonResponse({ success: false, message: "Pilih Data Panen dan Unggah Dokumen wajib diisi." }, 400);
    }

    const existingBatch = await prisma.batch.findUnique({
      where: { batchId: batchId },
      include: { events: true }
    });

    if (!existingBatch || existingBatch.farmerId !== actorUserId) {
      return jsonResponse({ success: false, message: "Data Panen tidak valid atau tidak ditemukan." }, 404);
    }

    // Periksa apakah sudah ada pengajuan (eventType = 0)
    const hasApplication = existingBatch.events.some(e => e.eventType === 0);
    if (hasApplication) {
      return jsonResponse({ success: false, message: "Pengajuan sertifikasi sudah ada untuk data panen ini." }, 400);
    }

    // 1. Upload Doc to IPFS
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await documentFile.arrayBuffer());
    const safeName = `APP-${Date.now()}-${documentFile.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    
    tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);
    
    const docIpfs = await uploadToIPFS(tempPath, true);
    if (!docIpfs?.cid) throw new Error("Gagal mengupload dokumen ke IPFS");

    // 2. Create IPFS JSON Metadata for Application
    const applicationPayload = {
      productName: existingBatch.productName,
      documentHash: docIpfs.cid,
      farmerId: actorUserId,
      timestamp: new Date().toISOString()
    };
    const jsonString = JSON.stringify(applicationPayload);
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("Gagal mengupload metadata ke IPFS");

    // 3. Simpan ke Database
    // Update Batch status to PENDING (karena sedang diajukan)
    await prisma.batch.update({
      where: { batchId: existingBatch.batchId },
      data: { status: "PENDING" }
    });

    // Membuat event pengajuan (eventType = 0 untuk Application, belum dicatat di blockchain)
    await prisma.productEvent.create({
      data: {
        batchId: existingBatch.batchId,
        batchRefId: existingBatch.id,
        eventType: 0, 
        ipfsHash: jsonIpfs.cid,
        actorUserId: actorUserId,
        actorAddress: "N/A", // Not on chain yet
        txHash: `PENDING_APP_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        chainType: "NONE",
        blockNumber: 0,
        logIndex: 0,
        blockTimestamp: new Date(),
      }
    });

    return jsonResponse({
      success: true,
      message: "Pengajuan Sertifikasi berhasil disimpan.",
      batchId: existingBatch.batchId
    });

  } catch (err: any) {
    console.error("Apply Certification Error:", err);
    return jsonResponse({ success: false, message: err.message || "Internal Server Error" }, 500);
  } finally {
    if (tempPath) {
      try { await unlink(tempPath); } catch {}
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return jsonResponse({ success: false, message: "Authentication required." }, 401);

    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    if (!decoded.id || decoded.role !== 'FARMER') {
      return jsonResponse({ success: false, message: "Unauthorized." }, 403);
    }

    const applications = await prisma.productEvent.findMany({
      where: {
        actorUserId: decoded.id,
        eventType: 0 // Only Applications
      },
      include: {
        batch: {
          include: {
            events: true // Fetch all events to get harvest data later if needed
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const records = await Promise.all(applications.map(async (app) => {
      let location = "N/A";
      let docHash = null;
      let pName = app.batch?.productName || "N/A";
      let hDate = null;
      let qty = null;
      let pUnit = "kg";
      
      // Get harvest IPFS hash if it exists to retrieve harvest info
      const harvestEvent = app.batch?.events?.find(e => e.eventType === 1);
      
      if (harvestEvent?.ipfsHash) {
        try {
          const { getIpfsJson } = await import("@/lib/ipfs/getIpfsJson");
          const harvestIpfsData = await getIpfsJson(harvestEvent.ipfsHash);
          location = harvestIpfsData.location || location;
          pName = harvestIpfsData.productName || pName;
          hDate = harvestIpfsData.harvestDate || hDate;
          qty = harvestIpfsData.quantity || qty;
          pUnit = harvestIpfsData.unit || pUnit;
        } catch {}
      }

      if (app.ipfsHash) {
        try {
          const { getIpfsJson } = await import("@/lib/ipfs/getIpfsJson");
          const ipfsData = await getIpfsJson(app.ipfsHash);
          docHash = ipfsData.documentHash || docHash;
        } catch {}
      }

      return {
        id: app.batch?.id,
        batchId: app.batch?.batchId,
        productName: pName,
        harvestDate: hDate,
        quantity: qty,
        unit: pUnit,
        status: app.batch?.status,
        location: location,
        documentHash: docHash,
        createdAt: app.createdAt.toISOString()
      };
    }));

    return jsonResponse({ success: true, records });
  } catch (error: any) {
    console.error("GET Cert Applications Error:", error);
    return jsonResponse({ success: false, message: "Server error" }, 500);
  }
}
