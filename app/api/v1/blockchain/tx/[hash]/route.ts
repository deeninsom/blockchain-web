
import { NextRequest, NextResponse } from 'next/server';
import { getDecodedTxData } from '../../../../../../lib/blockchain/decoder';

// 🛑 KOREKSI: Ekspor properti konfigurasi secara individual
// export const runtime = 'edge'; // <-- Dulu: config: { runtime: 'edge' }
// export const dynamic = 'force-dynamic'; // <-- Opsional: Memastikan data selalu baru

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ hash: string }> }
) {
  // ... (Logika yang sama persis seperti sebelumnya)
  const txHash = (await (context.params)).hash;

  if (!txHash || !txHash.startsWith('0x')) {
    return NextResponse.json({ success: false, message: 'Invalid transaction hash format.' }, { status: 400 });
  }

  try {
    const data = await getDecodedTxData(txHash);

    const status = data.status === 'PENDING' ? 202 : 200;

    return NextResponse.json({ success: true, data }, { status });
  } catch (error: any) {
    console.error("Blockchain API Error:", error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch transaction data.' }, { status: 500 });
  }
}