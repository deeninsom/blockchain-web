import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { throughput, duration } = await req.json();

    // 1. Buat Parent Session untuk mencatat hasil uji coba ini
    const session = await prisma.testSession.create({
      data: {
        duration: parseInt(duration) || 0,
        targetThroughput: parseInt(throughput) || 0,
      }
    });

    // 2. Ambil data sampel saja (hanya sebagai referensi ID, bukan untuk loop semua)
    const sampleBatch = await prisma.batch.findFirst();
    const sampleUser = await prisma.user.findFirst({ where: { role: 'FARMER' } });

    if (!sampleBatch || !sampleUser) {
      return NextResponse.json({ error: "Data referensi (Batch/User) tidak ditemukan" }, { status: 400 });
    }

    // 3. Batasi beban kerja agar tidak terjadi data explosion
    // Kita gunakan jumlah throughput sebagai jumlah iterasi, bukan mengalikan seluruh isi DB
    const iterations = Math.min(parseInt(throughput) || 10, 50); // Maksimal 50 per klik agar aman
    const tasks = [];
    const startTime = Date.now();

    console.log(`Memulai benchmark: ${iterations} iterasi untuk masing-masing chain...`);

    // 4. Load Generator (Producer)
    // Menggunakan loop terkontrol untuk mengumpulkan janji (promises)
    for (let i = 0; i < iterations; i++) {
      tasks.push(simulateTransaction("ETHEREUM", sampleBatch, sampleUser, session.id));
      tasks.push(simulateTransaction("HYPERLEDGER", sampleBatch, sampleUser, session.id));
    }

    // Jalankan simulasi secara paralel
    const allResults = await Promise.all(tasks);

    // 5. Helper Analyzer untuk menghitung metrik
    const calculateMetrics = (data: any[], totalDurationMs: number) => {
      if (data.length === 0) return { tps: 0, p50: 0, p95: 0, avg: 0, totalTx: 0 };

      const lats = data.map(d => d.latency);
      const sorted = [...lats].sort((a, b) => a - b);
      const durationSec = totalDurationMs / 1000;

      return {
        totalTx: data.length,
        tps: parseFloat((data.length / durationSec).toFixed(2)),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        avg: parseFloat((lats.reduce((a, b) => a + b, 0) / lats.length).toFixed(2))
      };
    };

    const totalDurationMs = Date.now() - startTime;
    const ethResults = allResults.filter(r => r.chain === "ETHEREUM");
    const hlfResults = allResults.filter(r => r.chain === "HYPERLEDGER");

    const responseData = {
      summary: {
        sessionId: session.id,
        iterationsPerChain: iterations,
        totalTransactions: allResults.length,
        actualDurationMs: totalDurationMs
      },
      ethereum: calculateMetrics(ethResults, totalDurationMs),
      hyperledger: calculateMetrics(hlfResults, totalDurationMs)
    };

    // 6. Simpan hasil agregat ke DB untuk history grafik
    await prisma.aggregateMetric.create({
      data: {
        sessionId: session.id,
        ethP50: responseData.ethereum.p50,
        ethP95: responseData.ethereum.p95,
        ethTps: responseData.ethereum.tps,
        hlfP50: responseData.hyperledger.p50,
        hlfP95: responseData.hyperledger.p95,
        hlfTps: responseData.hyperledger.tps,
      }
    });

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Benchmark Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Fungsi Internal untuk simulasi Transaksi
 * Diperbaiki: Tidak menulis ke tabel ProductEvent (Data Asli)
 */
async function simulateTransaction(chain: string, batch: any, user: any, sessionId: string) {
  const txStart = Date.now();

  // Simulasi waktu tunggu (Latency) masing-masing Blockchain
  const delayTime = chain === "ETHEREUM"
    ? 1000 + Math.random() * 500  // Ethereum lebih lambat (Mempool & Mining)
    : 150 + Math.random() * 100;  // Hyperledger lebih cepat (Direct Endorsement)

  await new Promise(r => setTimeout(r, delayTime));
  const includedTime = new Date();

  // CATATAN: Kita HANYA menulis ke tabel RawMetric untuk keperluan riset,
  // Kita TIDAK menulis ke prisma.productEvent agar dashboard tetap bersih.
  await prisma.rawMetric.create({
    data: {
      sessionId: sessionId,
      chainType: chain,
      submitTime: new Date(txStart),
      includedTime: includedTime,
      confirmationTime: new Date(),
      latencyMs: Date.now() - txStart,
      status: "SUCCESS"
    }
  });

  return { chain, latency: Date.now() - txStart };
}