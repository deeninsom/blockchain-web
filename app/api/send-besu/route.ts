import { NextResponse } from "next/server";
import { sendTestTransaction } from "@/lib/blockchain/besu";

export async function GET() {
  try {
    console.log('tes')
    const hash = await sendTestTransaction();
    console.log('tes2')
    return NextResponse.json({
      success: true,
      txHash: hash,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
