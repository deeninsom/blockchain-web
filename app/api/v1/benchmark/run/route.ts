import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { throughput, duration } = await req.json();

    const testDurationSec = parseInt(duration) || 10;
    const targetThroughput = parseInt(throughput) || 5;

    // 1. Buat Parent Session
    const session = await prisma.testSession.create({
      data: {
        duration: testDurationSec,
        targetThroughput,
      }
    });

    // 2. Ambil data referensi
    const sampleBatch = await prisma.batch.findFirst();
    const sampleUser = await prisma.user.findFirst({
      where: { role: "FARMER" }
    });

    if (!sampleBatch || !sampleUser) {
      return NextResponse.json(
        { error: "Data referensi (Batch/User) tidak ditemukan" },
        { status: 400 }
      );
    }

    console.log(
      `Benchmark dimulai | duration=${testDurationSec}s | target=${targetThroughput} tx/s`
    );

    // 3. Time-based Load Generator
    const tasks: Promise<any>[] = [];
    const startBenchmark = Date.now();
    const endBenchmark = startBenchmark + testDurationSec * 1000;

    while (Date.now() < endBenchmark) {
      for (let i = 0; i < targetThroughput; i++) {
        tasks.push(
          simulateTransaction("ETHEREUM", sampleBatch, sampleUser, session.id)
        );
        tasks.push(
          simulateTransaction("HYPERLEDGER", sampleBatch, sampleUser, session.id)
        );
      }

      // pacing 1 detik
      await new Promise(res => setTimeout(res, 1000));
    }

    const allResults = await Promise.all(tasks);

    // 4. Pisahkan hasil per chain
    const ethResults = allResults.filter(r => r.chain === "ETHEREUM");
    const hlfResults = allResults.filter(r => r.chain === "HYPERLEDGER");

    // 5. Analyzer
    const calculateMetrics = (data: any[]) => {
      if (data.length === 0) {
        return { totalTx: 0, tps: 0, p50: 0, p95: 0, avg: 0 };
      }

      const latencies = data.map(d => d.latency);
      const sorted = [...latencies].sort((a, b) => a - b);

      const startTimes = data.map(d => d.start);
      const endTimes = data.map(d => d.end);

      const durationMs =
        Math.max(...endTimes) - Math.min(...startTimes);

      const durationSec = durationMs / 1000;

      return {
        totalTx: data.length,
        tps: parseFloat((data.length / durationSec).toFixed(2)),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        avg: parseFloat(
          (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
        )
      };
    };

    const responseData = {
      summary: {
        sessionId: session.id,
        testDurationSec,
        targetThroughputPerSec: targetThroughput,
        totalTransactions: allResults.length,
      },
      ethereum: calculateMetrics(ethResults),
      hyperledger: calculateMetrics(hlfResults)
    };

    // 6. Simpan hasil agregat
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
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Simulasi Transaksi Blockchain
 */
async function simulateTransaction(
  chain: "ETHEREUM" | "HYPERLEDGER",
  batch: any,
  user: any,
  sessionId: string
) {
  const start = Date.now();

  const delayTime =
    chain === "ETHEREUM"
      ? 1000 + Math.random() * 500
      : 150 + Math.random() * 100;

  await new Promise(res => setTimeout(res, delayTime));

  const end = Date.now();

  await prisma.rawMetric.create({
    data: {
      sessionId,
      chainType: chain,
      submitTime: new Date(start),
      includedTime: new Date(end),
      confirmationTime: new Date(),
      latencyMs: end - start,
      status: "SUCCESS"
    }
  });

  return {
    chain,
    latency: end - start,
    start,
    end
  };
}