// src/app/api/v1/harvest/record/[id]/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const batchId = (await context.params).id;

    /* ===============================
       1. AUTH
    =============================== */
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return jsonResponse({ success: false, message: "Authentication required." }, 401);

    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    const actorUserId = decoded.id;
    const actorUserRole = decoded.role;
    if (!actorUserId) return jsonResponse({ success: false, message: "Unauthorized or Invalid User." }, 403);

    /* ===============================
       2. WHERE CLAUSE
    =============================== */
    const whereClause: any = { batchRefId: batchId };
    if (actorUserRole === "PETANI") whereClause.actorUserId = actorUserId;

    /* ===============================
       3. GET EVENTS
    =============================== */
    const events = await prisma.productEvent.findMany({
      where: whereClause,
      include: { batch: { select: { status: true, productName: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!events.length) return jsonResponse({ success: false, message: "No events found for this batch." }, 404);

    const firstEvent = events[0];
    const batchStatus = firstEvent.batch?.status || (events.some(e => e.txHash) ? "CONFIRMED" : "PENDING");

    /* ===============================
       4. HANDLE IPFS DATA & GROUP NETWORKS
    =============================== */
    // Map IPFS hash ke data & network
    const ipfsMap: Record<string, { data: any | null, networks: any[] }> = {};

    for (const ev of events) {
      const hash = ev.ipfsHash || ev.certificateFileHash;
      if (!hash) continue;

      if (!ipfsMap[hash]) {
        try {
          ipfsMap[hash] = {
            data: await getIpfsJson(hash),
            networks: [{
              network: ev.chainType,
              txHash: ev.txHash,
              blockNumber: ev.blockNumber?.toString() || "0",
              blockTimestamp: ev.blockTimestamp?.toISOString() || ev.createdAt.toISOString(),
            }],
          };
        } catch {
          ipfsMap[hash] = {
            data: null,
            networks: [{
              network: ev.chainType,
              txHash: ev.txHash,
              blockNumber: ev.blockNumber?.toString() || "0",
              blockTimestamp: ev.blockTimestamp?.toISOString() || ev.createdAt.toISOString(),
            }],
          };
        }
      } else {
        // Tambah network jika belum ada
        const exists = ipfsMap[hash].networks.find(n => n.txHash === ev.txHash);
        if (!exists) {
          ipfsMap[hash].networks.push({
            network: ev.chainType,
            txHash: ev.txHash,
            blockNumber: ev.blockNumber?.toString() || "0",
            blockTimestamp: ev.blockTimestamp?.toISOString() || ev.createdAt.toISOString(),
          });
        }
      }
    }

    /* ===============================
       5. AMBIL 1 HARVEST & 1 CERTIFICATION
    =============================== */
    const harvestEvent = events.find(e => e.eventType === 1);
    const certEvent = events.find(e => e.eventType === 99);

    const harvestData = harvestEvent ? (() => {
      const ipfs = ipfsMap[harvestEvent.ipfsHash];
      return {
        id: harvestEvent.id,
        batchId: harvestEvent.batchId,
        location: ipfs?.data?.location || "N/A",
        productName: ipfs?.data?.productName || harvestEvent.batch?.productName || "N/A",
        harvestDate: ipfs?.data?.harvestDate || harvestEvent.createdAt.toISOString(),
        quantity: ipfs?.data?.quantity || "0",
        unit: ipfs?.data?.unit || "kg",
        photoIpfsHash: ipfs?.data?.photoIpfsHash || null,
        networks: ipfs?.networks || [],
        ipfs: ipfs?.data || null,
      };
    })() : null;

    const certificationData = certEvent ? (() => {
      const hash = certEvent.ipfsHash || certEvent.certificateFileHash;
      const ipfs = ipfsMap[hash];
      return {
        id: certEvent.id,
        batchId: certEvent.batchId,
        certificateName: ipfs?.data?.certName || null,
        categoryName: ipfs?.data?.categoryName || null,
        expiryDate: ipfs?.data?.expiryDate || null,
        notes: ipfs?.data?.notes || null,
        certificateFileHash: ipfs?.data?.certificateHash || null,
        issuedByUserId: ipfs?.data?.issuedByUserId || null,
        networks: ipfs?.networks || [],
        ipfs: ipfs?.data || null,
      };
    })() : null;

    /* ===============================
       6. FORMAT RESPONSE
    =============================== */
    const recordDetail = {
      batchId: firstEvent.batchId,
      status: batchStatus,
      harvestData,
      certificationData,
    };

    return jsonResponse(recordDetail);

  } catch (err: any) {
    console.error("GET Batch Detail Error:", err.message);
    return jsonResponse({ success: false, message: "Failed to fetch batch detail." }, 500);
  }
}
