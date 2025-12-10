// app/api/v1/logistic/[batchId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";
import { getIpfsJson } from "@/lib/ipfs/getIpfsJson";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

interface CustomJwtPayload extends JwtPayload {
  id?: string;
  role?: string;
}

// Event Type 1 = HARVEST (Event yang menyimpan kuantitas awal)
const HARVEST_EVENT_TYPE = 1;

/**
 * Endpoint GET untuk mengambil detail produk berdasarkan Batch ID (dari hasil scan QR Code).
 * URL: /api/v1/logistic/[batchId]
 */
export async function GET(req: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  const batchId = (await (context.params)).batchId;

  try {
    // --- 1. OTORISASI ---
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return jsonResponse({ success: false, message: "Authentication required." }, 401);
    }
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    // Hanya Logistik/Operator yang boleh melakukan scan
    if (decoded.role !== 'RETAIL_OPERATOR' && decoded.role !== 'CENTRAL_OPERATOR') {
      return jsonResponse({ success: false, message: "Unauthorized role for this operation." }, 403);
    }

    // --- 2. VALIDASI BATCH ---
    if (!batchId) {
      return jsonResponse({ success: false, message: "Batch ID is required." }, 400);
    }

    // --- 3. AMBIL DATA BATCH & PETANI ---
    const batch = await prisma.batch.findUnique({
      where: { batchId: batchId },
      select: {
        id: true,
        batchId: true,
        productName: true,
        status: true,
        farmerId: true,
        farmer: {
          select: { actorAddress: true, name: true, id: true }
        }
      }
    });

    if (!batch) {
      return jsonResponse({ success: false, message: `Batch ID ${batchId} tidak ditemukan.` }, 404);
    }

    // Cek status: Batch harus siap di-pickup
    if (batch.status !== 'VERIFIED' && batch.status !== 'CONFIRMED') {
      return jsonResponse({ success: false, message: `Batch ${batchId} berstatus ${batch.status}. Hanya batch VERIFIED/CONFIRMED yang dapat di-pickup.` }, 409);
    }

    // --- 4. AMBIL DATA KUANTITAS DARI EVENT HARVEST (Event Type 1) ---
    const harvestEvent = await prisma.productEvent.findFirst({
      where: { batchId: batch.batchId, eventType: HARVEST_EVENT_TYPE },
      orderBy: { blockTimestamp: 'asc' }, // Ambil event pertama
      select: { ipfsHash: true }
    });

    if (!harvestEvent || !harvestEvent.ipfsHash) {
      return jsonResponse({ success: false, message: `Data harvest untuk batch ini tidak ditemukan.` }, 404);
    }

    const ipfsData = await getIpfsJson(harvestEvent.ipfsHash);

    if (!ipfsData.quantity || !ipfsData.unit) {
      return jsonResponse({ success: false, message: "Kuantitas produk tidak ditemukan dalam data Harvest IPFS." }, 404);
    }

    // --- 5. RESPONSE DATA ---
    return jsonResponse({
      success: true,
      data: {
        batchRefId: batch.id,
        batchId: batch.batchId,
        productName: batch.productName,
        farmerAddress: batch.farmer?.actorAddress,
        farmerName: batch.farmer?.name,
        initialQuantity: ipfsData.quantity, // Quantity dari data IPFS Harvest
        unit: ipfsData.unit,
        status: batch.status,
      }
    });

  } catch (err: any) {
    console.error("GET Product Data Error:", err);
    return jsonResponse({ success: false, message: err.message || "Internal Server Error" }, 500);
  }
}