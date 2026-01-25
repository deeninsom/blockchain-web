"use client"
import { AdminLayout } from '@/components/admin/admin-layout';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

export default function PerformanceLab() {
  const [dbData, setDbData] = useState({ batches: [], users: [] });
  const [form, setForm]: any = useState({ throughput: 5, duration: 3, batchId: '', userId: '' });
  const [results, setResults]: any = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/benchmark/setup')
      .then(res => res.json())
      .then(setDbData);
  }, []);

  const handleRunTest = async () => {
    setLoading(true);
    const res = await fetch('/api/v1/benchmark/run', {
      method: 'POST',
      body: JSON.stringify({
        throughput: parseInt(form.throughput),
        duration: parseInt(form.duration),
        selectedBatchId: form.batchId,
        selectedUserId: form.userId
      })
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  const fasterChain =
    results?.ethereum.avg < results?.hyperledger.avg
      ? "Ethereum"
      : "Hyperledger Fabric";

  const eth = results?.ethereum;
  const hlf = results?.hyperledger;

  const latencyGapPct = eth && hlf
    ? (((eth.avg - hlf.avg) / eth.avg) * 100).toFixed(1)
    : 0;

  const tpsWinner =
    eth && hlf
      ? eth.tps > hlf.tps
        ? "Ethereum"
        : eth.tps < hlf.tps
          ? "Hyperledger Fabric"
          : "Equal"
      : null;

  const insightText = () => {
    if (!eth || !hlf) return "";

    if (eth.tps === hlf.tps && hlf.avg < eth.avg) {
      return `
    Walaupun kedua platform menunjukkan throughput yang sama (${eth.tps} TPS),
    Hyperledger Fabric memiliki latency rata-rata ${latencyGapPct}% lebih rendah
    dibanding Ethereum. Hal ini menunjukkan bahwa Fabric lebih efisien dalam
    skenario transaksi privat dengan kebutuhan konfirmasi cepat.
    `;
    }

    if (eth.tps > hlf.tps && eth.avg < hlf.avg) {
      return `
    Ethereum unggul baik dari sisi throughput maupun latency,
    menjadikannya kandidat kuat untuk sistem terdistribusi publik
    dengan kebutuhan skalabilitas tinggi.
    `;
    }

    if (hlf.avg < eth.avg) {
      return `
    Hyperledger Fabric menunjukkan performa latency yang lebih stabil
    (avg dan p95 lebih rendah), sehingga lebih sesuai untuk
    kebutuhan traceability real-time dan sistem enterprise tertutup.
    `;
    }

    return `
  Kedua platform menunjukkan karakteristik performa yang relatif seimbang.
  Pemilihan teknologi sebaiknya mempertimbangkan faktor non-teknis
  seperti model governance dan kebutuhan privasi data.
  `;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen text-white p-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Blockchain Performance Lab
          </h1>
          <p className="text-gray-400 mt-2">
            Analisis Kinerja PT. BOS Fresh (Ethereum vs Hyperledger Fabric)
          </p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-xl border border-gray-700 bg-gray-900">
          <div>
            <label className="text-xs text-gray-400">Real Batch</label>
            <select
              className="w-full bg-gray-800 p-2 rounded mt-1"
              onChange={e => setForm({ ...form, batchId: e.target.value })}
            >
              <option value="">-- Choose Batch --</option>
              {dbData.batches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.batchId} - {b.productName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">Actor</label>
            <select
              className="w-full bg-gray-800 p-2 rounded mt-1"
              onChange={e => setForm({ ...form, userId: e.target.value })}
            >
              <option value="">-- Choose User --</option>
              {dbData.users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">Throughput (tx/sec)</label>
            <input
              type="number"
              className="w-full bg-gray-800 p-2 rounded mt-1"
              value={form.throughput}
              onChange={e => setForm({ ...form, throughput: e.target.value })}
            />
          </div>

          <button
            onClick={handleRunTest}
            disabled={loading || !form.batchId}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 rounded h-11 mt-5 font-bold transition"
          >
            {loading ? "Running Benchmark..." : "Execute Analysis"}
          </button>
        </div>

        {results && (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <SummaryCard title="Session ID" value={results.summary.sessionId.slice(0, 8)} />
              <SummaryCard title="Total Transactions" value={results.summary.totalTransactions} />
              <SummaryCard title="Duration (ms)" value={results.summary.testDurationSec} />
              <SummaryCard
                title="Faster Network"
                value={fasterChain}
                highlight
              />
            </div>

            {/* Performance Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <ChainCard name="Ethereum" color="blue" data={results.ethereum} />
              <ChainCard name="Hyperledger Fabric" color="green" data={results.hyperledger} />
            </div>

            {/* Charts */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">
                Throughput Comparison (TPS)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Ethereum', tps: results.ethereum.tps },
                    { name: 'Hyperledger', tps: results.hyperledger.tps }
                  ]}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tps" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                Latency Distribution (ms)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Avg', eth: results.ethereum.avg, hlf: results.hyperledger.avg },
                    { name: 'p50', eth: results.ethereum.p50, hlf: results.hyperledger.p50 },
                    { name: 'p95', eth: results.ethereum.p95, hlf: results.hyperledger.p95 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="eth" stroke="#6366f1" name="Ethereum" strokeWidth={2} />
                    <Line dataKey="hlf" stroke="#10b981" name="Hyperledger" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insight */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold mb-3 text-yellow-400">
                📌 Performance Insight (Auto Analysis)
              </h3>

              <div className="space-y-2 text-gray-300 text-sm leading-relaxed">
                <p>{insightText()}</p>

                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded border border-gray-700">
                    <p className="text-xs text-gray-400">Latency Advantage</p>
                    <p className="font-bold text-green-400">
                      {latencyGapPct}% Faster
                    </p>
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-700">
                    <p className="text-xs text-gray-400">TPS Winner</p>
                    <p className="font-bold text-blue-400">
                      {tpsWinner}
                    </p>
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-700">
                    <p className="text-xs text-gray-400">Recommended Use Case</p>
                    <p className="font-bold text-yellow-400">
                      {fasterChain === "Hyperledger Fabric"
                        ? "Enterprise Traceability"
                        : "Public Distributed System"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ---------- Components ---------- */

const SummaryCard = ({ title, value, highlight = false }: any) => (
  <div className={`p-5 rounded-xl border ${highlight ? 'border-yellow-400' : 'border-gray-700'} bg-gray-900`}>
    <p className="text-xs text-gray-400">{title}</p>
    <p className={`text-xl font-bold mt-1 ${highlight && 'text-yellow-400'}`}>
      {value}
    </p>
  </div>
);

const ChainCard = ({ name, color, data }: any) => (
  <div className="p-6 rounded-xl bg-gray-900 border border-gray-700">
    <h3 className={`text-lg font-bold mb-4 text-${color}-400`}>{name}</h3>
    <ul className="space-y-2 text-sm text-gray-300">
      <li>Total TX: <b>{data.totalTx}</b></li>
      <li>TPS: <b>{data.tps}</b></li>
      <li>Avg Latency: <b>{data.avg} ms</b></li>
      <li>p95 Latency: <b>{data.p95} ms</b></li>
    </ul>
  </div>
);