import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { signAndSendTransaction } from "@/lib/blockchain/transaction";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson";
import { generateBatchId } from "@/lib/generateBatchId";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

interface IpfsPayload {
  batchId: string;
  eventType: number;
  farmerId: string;
  productName: string;
  harvestDate: string;
  location: string;
  quantity: string;
  unit: string;
  photoIpfsHash: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  let tempPath: string | undefined;

  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    if (!actorUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized or Invalid User." }, { status: 403 });
    }

    const form = await req.formData();
    const productName = form.get("productName")?.toString() ?? "";
    const location = form.get("location")?.toString() ?? "";
    const harvestDate = form.get("harvestDate")?.toString();
    const quantity = form.get("quantity")?.toString();
    const unit = form.get("unit")?.toString();
    const photo = form.get("photo") as File | null;

    if (!harvestDate || !photo || !quantity || !unit) {
      return NextResponse.json({ success: false, message: "Missing required form data." }, { status: 400 });
    }

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

    tempPath = path.join(uploadDir, safeName);
    await writeFile(tempPath, buffer);
    const photoIpfs = await uploadToIPFS(tempPath, true);
    if (!photoIpfs?.cid) throw new Error("Photo IPFS upload failed");

    const eventType = 1;
    const batchId = generateBatchId('HRV')

    const ipfsPayload: IpfsPayload = {
      batchId,
      eventType,
      farmerId: actorUserId,
      productName,
      harvestDate,
      location,
      quantity,
      unit,
      photoIpfsHash: photoIpfs.cid,
      timestamp: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(ipfsPayload);
    const jsonIpfs = await uploadToIPFS(jsonString, false, 'application/json');
    if (!jsonIpfs?.cid) throw new Error("JSON IPFS upload failed");

    const ipfsHash = jsonIpfs.cid;

    const user = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user || !user.actorAddress) throw new Error("Actor wallet address not found.");

    const batch = await prisma.batch.upsert({
      where: { batchId: batchId },
      update: { farmerId: actorUserId, productName: ipfsPayload.productName, },
      create: { batchId, productName: ipfsPayload.productName, farmerId: actorUserId },
    });

    const txResult = await signAndSendTransaction(user.actorAddress, batch.batchId, ipfsHash, eventType);

    const productEvent = await prisma.productEvent.create({
      data: {
        batchId: batch.batchId,
        batchRefId: batch.id,
        eventType: eventType,
        ipfsHash: ipfsHash,
        actorAddress: user.actorAddress,
        actorUserId: user.id,
        txHash: txResult.txHash,
        blockNumber: txResult.blockNumber,
        logIndex: txResult.logIndex,
        blockTimestamp: txResult.blockTimestamp,
      },
    });

    // PERBAIKAN: Ganti jsonResponse dengan NextResponse.json
    return NextResponse.json({
      success: true, // Diubah dari false ke true (success)
      message: "Record submitted successfully.",
      eventId: productEvent.id,
      txHash: txResult.txHash,
    }, { status: 200 });
  } catch (err: any) {
    console.error("Harvest Record Error:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch (cleanupErr) {
        console.error("Failed to clean up temp file:", cleanupErr);
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const batchId = url.searchParams.get('batchId');

  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    const actorUserRole = decoded.role;

    if (!actorUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized or Invalid User." }, { status: 403 });
    }

    const whereClause: any = {
      eventType: 1,
    };

    if (actorUserRole === 'PETANI') {
      whereClause.actorUserId = actorUserId;
    }

    if (batchId) {
      whereClause.batchId = batchId;
    }

    const events = await prisma.productEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        batchId: true,
        ipfsHash: true,
        txHash: true,
        createdAt: true,
        batch: {
          select: {
            productName: true,
            status: true
          },
        },
      },
    });

    const recordsWithIpfsData = await Promise.all(
      events.map(async (event) => {
        const { batch, ...restOfEvent } = event;

        const batchProductName = batch?.productName
        const batchStatus = batch?.status

        // Handle kasus tanpa IPFS Hash
        if (!restOfEvent.ipfsHash) {
          return {
            ...restOfEvent,
            productName: batchProductName,
            status: batchStatus,
            location: "N/A",
            harvestDate: restOfEvent.createdAt.toISOString(),
            quantity: "0",
            unit: "N/A",
            photoIpfsHash: null,
          }
        }

        const ipfsData = await getIpfsJson(restOfEvent.ipfsHash);

        return {
          ...restOfEvent,
          productName: ipfsData.productName || batchProductName,
          status: batchStatus,
          location: ipfsData.location,
          harvestDate: ipfsData.harvestDate || restOfEvent.createdAt.toISOString(),
          quantity: ipfsData.quantity,
          unit: ipfsData.unit,
          photoIpfsHash: ipfsData.photoIpfsHash,
        };
      })
    );

    return NextResponse.json({ success: true, records: recordsWithIpfsData }, { status: 200 });

  } catch (err: any) {
    console.error("GET Harvest Record Error:", err.message);

    // Penanganan error JWT eksplisit
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      // PERBAIKAN: Ganti jsonResponse dengan NextResponse.json
      return NextResponse.json({ success: false, message: "Invalid or expired token." }, { status: 401 });
    }

    // PERBAIKAN: Ganti jsonResponse dengan NextResponse.json
    return NextResponse.json({ success: false, message: "Failed to fetch data." }, { status: 500 });
  }
}