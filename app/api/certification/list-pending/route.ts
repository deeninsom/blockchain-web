import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jsonResponse } from "@/lib/json";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.AUTH_SECRET || "your_super_secret_fallback";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return jsonResponse({ success: false, message: "Authentication required." }, 401);

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.role !== 'ADMIN') {
      return jsonResponse({ success: false, message: "Akses ditolak: Hanya Admin." }, 403);
    }

    // Ambil pengajuan sertifikasi (Batch & event dengan eventType = 0)
    const applications = await prisma.productEvent.findMany({
      where: { eventType: 0 },
      include: {
        batch: true,
        actorUser: {
          select: { name: true, email: true, actorAddress: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const records = await Promise.all(applications.map(async (app) => {
      let documentHash = null;
      let location = "N/A";

      if (app.ipfsHash) {
        try {
          const { getIpfsJson } = await import("@/lib/ipfs/getIpfsJson");
          const ipfsData = await getIpfsJson(app.ipfsHash);
          documentHash = ipfsData.documentHash;
          location = ipfsData.location || location;
        } catch {}
      }

      return {
        id: app.batch?.id,
        batchRefId: app.batch?.id, // Supaya UI [id]/page.tsx bisa arahin fetch yang benar
        batchId: app.batch?.batchId,
        productName: app.batch?.productName,
        farmerName: app.actorUser?.name || "Unknown",
        farmerAddress: app.actorUser?.actorAddress || "",
        location: location,
        documentHash: documentHash,
        status: app.batch?.status,
        createdAt: app.createdAt.toISOString(),
      };
    }));

    return jsonResponse({ success: true, records });

  } catch (err: any) {
    console.error("GET Pending Certifications Error:", err);
    return jsonResponse({ success: false, message: "Server error" }, 500);
  }
}
