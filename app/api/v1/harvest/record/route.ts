import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import os from 'os';
import { prisma } from "@/lib/prisma";
import { uploadToIPFS } from "@/lib/ipfs/uploadToIPFS";
import { sendToBothNetworks } from "@/lib/blockchain/transaction";
import jwt, { JwtPayload } from 'jsonwebtoken';
// Hapus import { jsonResponse } dari "@/lib/json";
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

    // Penggunaan req.formData() harus dilakukan HANYA sekali sebelum semua response
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

    const savedEvents = [];
    const txResults = await sendToBothNetworks(user.actorAddress, batch.batchId, ipfsHash, eventType);

    for (const tx of txResults) {
      const saved = await prisma.productEvent.create({
        data: {
          batchId: batch.batchId,
          batchRefId: batch.id,
          eventType,
          ipfsHash,
          chainType:
            tx.network === "Ethereum Sepolia" ? "SEPOLIA" : "AMOY",
          actorAddress: user.actorAddress,
          actorUserId: user.id,
          txHash: tx.txHash,
          blockNumber: tx.blockNumber,
          logIndex: 0,
          blockTimestamp: tx.blockTimestamp,
        },
      });

      savedEvents.push({
        network: tx.network,
        txHash: tx.txHash,
        eventId: saved.id,
      });
    }

    // const productEvent = await prisma.productEvent.create({
    //   data: {
    //     batchId: batch.batchId,
    //     batchRefId: batch.id,
    //     eventType: eventType,
    //     ipfsHash: ipfsHash,
    //     actorAddress: user.actorAddress,
    //     actorUserId: user.id,
    //     txHash: txResult.txHash,
    //     blockNumber: txResult.blockNumber,
    //     logIndex: txResult.logIndex,
    //     blockTimestamp: txResult.blockTimestamp,
    //   },
    // });

    // PERBAIKAN: Ganti jsonResponse dengan NextResponse.json
    return NextResponse.json({
      success: true, // Diubah dari false ke true (success)
      message: "Record submitted successfully.",
      transactions: savedEvents,
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
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    const actorUserRole = decoded.role;

    if (!actorUserId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized or Invalid User." },
        { status: 403 }
      );
    }

    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          where: { eventType: 1 },
          select: {
            id: true,
            txHash: true,
            chainType: true,
            ipfsHash: true,
            createdAt: true,
            actorUserId: true,
          },
        },
      },
    });

    if (batches.length === 0) {
      return NextResponse.json(
        { success: true, records: [] },
        { status: 200 }
      );
    }

    const filteredBatches =
      actorUserRole === "PETANI"
        ? batches.filter((batch) =>
          batch.events.some(
            (event) => event.actorUserId === actorUserId
          )
        )
        : batches;


    const records = await Promise.all(
      filteredBatches.map(async (batch) => {
        const txByChain: Record<string, string> = {};
        let firstEvent: any = null;

        batch.events.forEach((event) => {
          if (!firstEvent) firstEvent = event;

          if (event.chainType && event.txHash) {
            txByChain[event.chainType] = event.txHash;
          }
        });

        let ipfsData: any = {};

        if (firstEvent?.ipfsHash) {
          try {
            ipfsData = await getIpfsJson(firstEvent.ipfsHash);
          } catch { }
        }

        return {
          id: batch.id,
          batchId: batch.batchId,
          productName:
            ipfsData.productName || batch.productName || "N/A",
          status: batch.status || "UNKNOWN",
          location: ipfsData.location || "N/A",
          harvestDate:
            ipfsData.harvestDate ||
            firstEvent?.createdAt?.toISOString() ||
            batch.createdAt.toISOString(),
          quantity: ipfsData.quantity || "0",
          unit: ipfsData.unit || "kg",
          photoIpfsHash: ipfsData.photoIpfsHash || null,
          transactions: txByChain,
        };
      })
    );


    return NextResponse.json(
      { success: true, records },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET Harvest Record Error:", err.message);

    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch data." },
      { status: 500 }
    );
  }
}