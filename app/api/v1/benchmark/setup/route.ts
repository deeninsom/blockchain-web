import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/benchmark/setup
 * Returns batches and available comparison modes.
 * Actor is always admin (no user selection needed).
 */
export async function GET() {
  const batches = await prisma.batch.findMany({
    select: { id: true, batchId: true, productName: true }
  });

  // Available comparison modes
  const comparisonModes = [
    {
      value: "public_vs_public",
      label: "Public vs Public",
      description: "Ethereum Sepolia vs Polygon Amoy",
      chainA: "Ethereum Sepolia",
      chainB: "Polygon Amoy",
      icon: "🌐"
    },
    {
      value: "private_vs_private",
      label: "Private vs Private",
      description: "Besu IBFT 2.0 (4-Node) vs Hyperledger Fabric (2-Node)",
      chainA: "Besu IBFT 2.0",
      chainB: "Hyperledger Fabric",
      icon: "🔒"
    },
    {
      value: "public_vs_private",
      label: "Public vs Private",
      description: "Ethereum Sepolia vs Besu IBFT 2.0 (4-Node)",
      chainA: "Ethereum Sepolia",
      chainB: "Besu IBFT 2.0",
      icon: "🔄"
    },
    {
      value: "simulated",
      label: "Simulasi",
      description: "Simulasi Ethereum vs Hyperledger (tanpa biaya gas)",
      chainA: "Ethereum (Sim)",
      chainB: "Hyperledger (Sim)",
      icon: "⚡"
    }
  ];

  // Recent benchmark sessions
  const recentSessions = await prisma.testSession.findMany({
    take: 5,
    orderBy: { startTime: "desc" },
    include: {
      aggregates: true
    }
  });

  return NextResponse.json({
    batches,
    comparisonModes,
    recentSessions
  });
}