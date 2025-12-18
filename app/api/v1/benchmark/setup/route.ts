import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const batches = await prisma.batch.findMany({ select: { id: true, batchId: true, productName: true } });
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  return NextResponse.json({ batches, users });
}