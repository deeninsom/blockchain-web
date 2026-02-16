import { NextResponse } from "next/server";
import { getBesuBlockNumber } from "@/lib/blockchain/besu";

export async function GET() {
  try {
    const block = await getBesuBlockNumber();

    return NextResponse.json({
      success: true,
      network: "Besu Private",
      blockNumber: block,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

