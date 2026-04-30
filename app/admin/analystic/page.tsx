"use client"
import { AdminLayout } from '@/components/admin/admin-layout';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ============================================================
// Types
// ============================================================
interface ComparisonMode {
  value: string;
  label: string;
  description: string;
  chainA: string;
  chainB: string;
  icon: string;
}

interface ChainMetrics {
  name: string;
  type: string;
  totalTx: number;
  successTx: number;
  failedTx: number;
  tps: number;
  p50: number;
  p95: number;
  avg: number;
  min: number;
  max: number;
}

interface BenchmarkResult {
  summary: {
    sessionId: string;
    comparisonMode: string;
    modeDescription: string;
    totalTransactions: number;
    transactionsPerChain: number;
  };
  chainA: ChainMetrics;
  chainB: ChainMetrics;
}

// ============================================================
// Mode color schemes
// ============================================================
const MODE_COLORS: Record<string, { a: string; b: string; gradient: string }> = {
  public_vs_public: { a: "#6366f1", b: "#f59e0b", gradient: "from-indigo-500 to-amber-500" },
  private_vs_private: { a: "#10b981", b: "#8b5cf6", gradient: "from-emerald-500 to-violet-500" },
  public_vs_private: { a: "#3b82f6", b: "#10b981", gradient: "from-blue-500 to-emerald-500" },
  simulated: { a: "#6366f1", b: "#10b981", gradient: "from-indigo-500 to-emerald-500" },
};

// ============================================================
// Main Component
// ============================================================
export default function PerformanceLab() {
  const [modes, setModes] = useState<ComparisonMode[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [form, setForm] = useState({
    throughput: 10,
    comparisonMode: "simulated",
    batchId: ""
  });
  const [results, setResults] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    fetch('/api/v1/benchmark/setup')
      .then(res => res.json())
      .then(data => {
        setModes(data.comparisonModes || []);
        setBatches(data.batches || []);
      });
  }, []);

  const handleRunTest = async () => {
    setLoading(true);
    setResults(null);
    setProgress("Mengirim transaksi ke blockchain...");

    try {
      const res = await fetch('/api/v1/benchmark/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          throughput: form.throughput,
          comparisonMode: form.comparisonMode,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Benchmark gagal");
      }

      const data = await res.json();
      setResults(data);
      setProgress("");
    } catch (err: any) {
      setProgress(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentMode = modes.find(m => m.value === form.comparisonMode);
  const colors = MODE_COLORS[form.comparisonMode] || MODE_COLORS.simulated;

  const chainA = results?.chainA;
  const chainB = results?.chainB;

  const fasterChain = chainA && chainB
    ? chainA.avg < chainB.avg ? chainA.name : chainB.name
    : null;

  const latencyGapPct = chainA && chainB
    ? Math.abs(((chainA.avg - chainB.avg) / Math.max(chainA.avg, chainB.avg)) * 100).toFixed(1)
    : "0";

  const tpsWinner = chainA && chainB
    ? chainA.tps > chainB.tps ? chainA.name
      : chainA.tps < chainB.tps ? chainB.name
        : "Sama"
    : null;

  // ============================================================
  // Insight Generator
  // ============================================================
  const generateInsight = (): string => {
    if (!chainA || !chainB) return "";

    const aName = chainA.name;
    const bName = chainB.name;

    if (form.comparisonMode === "public_vs_public") {
      if (chainB.avg < chainA.avg) {
        return `Berdasarkan pengujian Public vs Public, Polygon Amoy mencetak latensi ${latencyGapPct}% lebih rendah dibandingkan Ethereum Sepolia. Arsitektur Layer-2 Polygon secara native didesain untuk skalabilitas tinggi dengan block time yang rapat (~2 detik), sangat ideal untuk sistem supply chain bervolume tinggi yang membidik zero-to-low gas fee tanpa sepenuhnya mengorbankan desentralisasi.`;
      }
      return `Secara persentase, Ethereum Sepolia mengungguli Polygon Amoy sebesar ${latencyGapPct}%. Meski secara teoritis memiliki block time lebih lama (~12s), Ethereum menunjukan performa konfirmasi yang solid pada sesi ini. Kestabilan ini menegaskan posisi Ethereum sebagai standar Layer-1 yang memberikan level keamanan tertinggi bagi pelacakan aset bernilai jumbo di sektor publik.`;
    }

    if (form.comparisonMode === "private_vs_private") {
      if (chainA.avg < chainB.avg) {
        return `Pada uji Private Enterprise ini, Hyperledger Besu (IBFT 2.0) memimpin komparasi dengan keunggulan ${latencyGapPct}% atas Hyperledger Fabric. Kinerja ini membuktikan bahwa eksekusi sistem Ethereum Virtual Machine (EVM) yang terisolasi dalam lingkungan konsensus BFT privat sangat luar biasa cepat. Besu adalah rekomendasi tak terbantahkan jika perusahaan Anda memerlukan kecepatan mumpuni sekaligus mempertahankan standarisasi Smart Contract berbasis Solidity.`;
      }
      return `Hyperledger Fabric mendominasi pengujian jaringan Private dengan latensi ${latencyGapPct}% lebih superior dari Besu IBFT. Kemenangan ini didorong oleh fleksibilitas arsitektur "Execute-Order-Validate" milik Fabric yang menghindari bottleneck urutan EVM tradisional. Fabric menjadi standar absolut untuk industri berskala raksasa yang menuntut throughput ekstrem, manajemen identitas (MSP) ketat, dan privasi antarperserta dalam sebuah supply chain.`;
    }

    if (form.comparisonMode === "public_vs_private") {
      if (chainB.avg < chainA.avg) {
        return `Sesuai teori struktural, Private Blockchain (${bName}) melesat meyakinkan dan memangkas waktu latensi hingga ${latencyGapPct}% lebih gegas daripada Public Blockchain (${aName}). Ketiadaan kompetisi block-mining publik, serta dihapuskannya batasan gas fee, menciptakan super-highway tanpa hambatan. Ini adalah justifikasi analitis terkuat mengapa pencatatan perusahaan korporat harus memprioritaskan arsitektur Private demi keandalan SLA (Service Level Agreement).`;
      }
      return `Berdasarkan pantauan anomali, Public Blockchain (${aName}) menunjukkan latensi tak terduga dengan selisih ${latencyGapPct}% di atas jaringan privat. Deviasi performa ini umumnya disebabkan oleh lonjakan utilitas CPU, I/O memory lokal, atau konfigurasi docker network selama benchmark berlangsung. Untuk penggunaan enterprise jangka panjang, private blockchain tetap disarankan di atas parameter ini.`;
    }

    // Simulated
    if (chainB.avg < chainA.avg) {
      return `Simulasi menempatkan ${bName} pada posisi unggul sebesar ${latencyGapPct}%. Ini memproyeksikan potensi efisiensi maksimum di mana model konsensus tersentralisasi-izin (permissioned) selalu memangkas latensi end-to-end tanpa overhead penambangan kriptografi publik.`;
    }
    return `Kedua platform mencatatkan skor bersaing. Keputusan strategis pada fase ini tidak lagi ditentukan oleh angka throughput semata, melainkan tata kelola organisasi (governance) dan kerahasiaan kepemilikan data antar anggota konsorsium.`;
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <AdminLayout>
      <div className="min-h-screen text-white p-6 md:p-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Blockchain Performance Lab
          </h1>
          <p className="text-gray-400 mt-2">
            Analisis Kinerja Blockchain — PT. BOS Fresh Supply Chain
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Aktor: Admin (Operator Wallet) • Pengujian otomatis
          </p>
        </div>

        {/* ============================== */}
        {/* Comparison Mode Selector */}
        {/* ============================== */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Mode Perbandingan</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setForm({ ...form, comparisonMode: mode.value })}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${form.comparisonMode === mode.value
                  ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{mode.label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ============================== */}
        {/* Control Panel */}
        {/* ============================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-xl border border-gray-700 bg-gray-900">
          <div>
            <label className="text-xs text-gray-400">Batch Data (Opsional)</label>
            <select
              className="w-full bg-gray-800 p-2.5 rounded-lg mt-1 border border-gray-700 focus:border-blue-500 focus:outline-none transition"
              onChange={e => setForm({ ...form, batchId: e.target.value })}
            >
              <option value="">-- Otomatis --</option>
              {batches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.batchId} - {b.productName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">
              Jumlah Transaksi Per Chain
              <span className="text-gray-500 ml-1">(maks: 500)</span>
            </label>
            <input
              type="number"
              min={1}
              max={500}
              className="w-full bg-gray-800 p-2.5 rounded-lg mt-1 border border-gray-700 focus:border-blue-500 focus:outline-none transition"
              value={form.throughput}
              onChange={e => {
                const val = Math.min(500, Math.max(1, parseInt(e.target.value) || 1));
                setForm({ ...form, throughput: val });
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.comparisonMode === "simulated"
                ? `Estimasi: ~${Math.ceil(form.throughput / 20 * 2)}s`
                : form.comparisonMode.includes("private")
                  ? `Estimasi: ~${Math.ceil(form.throughput * 3)}s (real tx)`
                  : `Estimasi: ~${Math.ceil(form.throughput * 15)}s (real tx)`
              }
            </p>
          </div>

          <div className="my-auto">
            <button
              onClick={handleRunTest}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 rounded-lg h-11 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "⏳ Menjalankan Benchmark..." : "🚀 Mulai Benchmark"}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        {progress && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-300 animate-pulse">{progress}</p>
          </div>
        )}

        {/* ============================== */}
        {/* Results */}
        {/* ============================== */}
        {results && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard title="Session ID" value={results.summary.sessionId.slice(0, 8)} />
              <SummaryCard title="Mode" value={results.summary.modeDescription} />
              <SummaryCard title="Total Transaksi" value={results.summary.totalTransactions} />
              <SummaryCard title="Per Chain" value={results.summary.transactionsPerChain} />
              <SummaryCard
                title="Jaringan Tercepat"
                value={fasterChain || "-"}
                highlight
              />
            </div>

            {/* Performance Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <ChainCard
                name={chainA!.name}
                color={colors.a}
                data={chainA!}
                isWinner={chainA!.avg <= chainB!.avg}
              />
              <ChainCard
                name={chainB!.name}
                color={colors.b}
                data={chainB!}
                isWinner={chainB!.avg <= chainA!.avg}
              />
            </div>

            {/* ============================== */}
            {/* Charts */}
            {/* ============================== */}

            {/* TPS Comparison */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">
                Perbandingan Throughput (TPS)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: chainA!.name, tps: chainA!.tps },
                    { name: chainB!.name, tps: chainB!.tps }
                  ]}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Bar dataKey="tps" radius={[6, 6, 0, 0]}>
                      {[colors.a, colors.b].map((color, index) => (
                        <rect key={index} fill={color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Distribution */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                Distribusi Latensi (ms)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Min', a: chainA!.min, b: chainB!.min },
                    { name: 'Avg', a: chainA!.avg, b: chainB!.avg },
                    { name: 'p50', a: chainA!.p50, b: chainB!.p50 },
                    { name: 'p95', a: chainA!.p95, b: chainB!.p95 },
                    { name: 'Max', a: chainA!.max, b: chainB!.max },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                    <Legend />
                    <Line dataKey="a" stroke={colors.a} name={chainA!.name} strokeWidth={2} dot={{ r: 4 }} />
                    <Line dataKey="b" stroke={colors.b} name={chainB!.name} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart — Performance Overview */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Performa Keseluruhan (Radar)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { metric: 'TPS', a: chainA!.tps, b: chainB!.tps },
                    { metric: 'Avg Speed', a: chainA!.avg > 0 ? Math.round(10000 / chainA!.avg) : 0, b: chainB!.avg > 0 ? Math.round(10000 / chainB!.avg) : 0 },
                    { metric: 'Consistency', a: chainA!.p95 > 0 ? Math.round(chainA!.p50 / chainA!.p95 * 100) : 0, b: chainB!.p95 > 0 ? Math.round(chainB!.p50 / chainB!.p95 * 100) : 0 },
                    { metric: 'Success Rate', a: chainA!.totalTx > 0 ? Math.round(chainA!.successTx / chainA!.totalTx * 100) : 0, b: chainB!.totalTx > 0 ? Math.round(chainB!.successTx / chainB!.totalTx * 100) : 0 },
                  ]}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="metric" stroke="#9ca3af" fontSize={12} />
                    <PolarRadiusAxis stroke="#4b5563" fontSize={10} />
                    <Radar name={chainA!.name} dataKey="a" stroke={colors.a} fill={colors.a} fillOpacity={0.2} />
                    <Radar name={chainB!.name} dataKey="b" stroke={colors.b} fill={colors.b} fillOpacity={0.2} />
                    <Legend />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">
                Tabel Perbandingan Detail
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-400">Metrik</th>
                      <th className="text-right p-3" style={{ color: colors.a }}>{chainA!.name}</th>
                      <th className="text-right p-3" style={{ color: colors.b }}>{chainB!.name}</th>
                      <th className="text-right p-3 text-yellow-400">Pemenang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Total Transaksi", a: chainA!.totalTx, b: chainB!.totalTx, higherWins: true },
                      { label: "Transaksi Sukses", a: chainA!.successTx, b: chainB!.successTx, higherWins: true },
                      { label: "TPS", a: chainA!.tps, b: chainB!.tps, higherWins: true },
                      { label: "Avg Latency (ms)", a: chainA!.avg, b: chainB!.avg, higherWins: false },
                      { label: "p50 Latency (ms)", a: chainA!.p50, b: chainB!.p50, higherWins: false },
                      { label: "p95 Latency (ms)", a: chainA!.p95, b: chainB!.p95, higherWins: false },
                      { label: "Min Latency (ms)", a: chainA!.min, b: chainB!.min, higherWins: false },
                      { label: "Max Latency (ms)", a: chainA!.max, b: chainB!.max, higherWins: false },
                    ].map((row) => {
                      const winner = row.higherWins
                        ? (row.a > row.b ? chainA!.name : row.b > row.a ? chainB!.name : "Sama")
                        : (row.a < row.b ? chainA!.name : row.b < row.a ? chainB!.name : "Sama");
                      return (
                        <tr key={row.label} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="p-3 text-gray-300">{row.label}</td>
                          <td className="p-3 text-right font-mono">{row.a}</td>
                          <td className="p-3 text-right font-mono">{row.b}</td>
                          <td className="p-3 text-right text-yellow-400 font-medium">{winner}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================== */}
            {/* Insight */}
            {/* ============================== */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold mb-3 text-yellow-400">
                📊 Wawasan Kinerja (Analisis Otomatis)
              </h3>

              <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <p>{generateInsight()}</p>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">Keuntungan Latensi</p>
                    <p className="font-bold text-green-400 text-lg mt-1">
                      {latencyGapPct}% Faster
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{fasterChain}</p>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">Pemenang TPS</p>
                    <p className="font-bold text-blue-400 text-lg mt-1">
                      {tpsWinner}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {chainA!.tps} vs {chainB!.tps} TPS
                    </p>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">Rekomendasi</p>
                    <p className="font-bold text-yellow-400 text-lg mt-1">
                      {form.comparisonMode === "public_vs_public"
                        ? fasterChain === chainB?.name
                          ? "L2 Scaling (Polygon)"
                          : "Keamanan L1 (Ethereum)"
                        : form.comparisonMode === "private_vs_private"
                          ? fasterChain === chainA?.name
                            ? "EVM Private (Besu)"
                            : "Modular Enterprise (Fabric)"
                          : form.comparisonMode === "public_vs_private"
                            ? fasterChain === chainB?.name
                              ? "Enterprise Private"
                              : "Public Transparency"
                            : "Analisis Manual"}
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

/* ============================================================ */
/* Components                                                    */
/* ============================================================ */

const SummaryCard = ({ title, value, highlight = false }: { title: string; value: any; highlight?: boolean }) => (
  <div className={`p-4 rounded-xl border ${highlight ? 'border-yellow-400 bg-yellow-400/5' : 'border-gray-700 bg-gray-900'}`}>
    <p className="text-xs text-gray-400">{title}</p>
    <p className={`text-lg font-bold mt-1 truncate ${highlight && 'text-yellow-400'}`}>
      {value}
    </p>
  </div>
);

const ChainCard = ({ name, color, data, isWinner }: { name: string; color: string; data: ChainMetrics; isWinner: boolean }) => (
  <div className={`p-6 rounded-xl bg-gray-900 border ${isWinner ? 'border-green-500/50' : 'border-gray-700'} relative`}>
    {isWinner && (
      <span className="absolute top-3 right-3 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
        ⚡ Fastest
      </span>
    )}
    <h3 className="text-lg font-bold mb-4" style={{ color }}>{name}</h3>
    <div className="grid grid-cols-2 gap-3">
      <MetricItem label="Total Tx" value={data.totalTx} />
      <MetricItem label="Success" value={`${data.successTx}/${data.totalTx}`} />
      <MetricItem label="TPS" value={data.tps} highlight />
      <MetricItem label="Avg Latency" value={`${data.avg} ms`} highlight />
      <MetricItem label="p50 Latency" value={`${data.p50} ms`} />
      <MetricItem label="p95 Latency" value={`${data.p95} ms`} />
      <MetricItem label="Min" value={`${data.min} ms`} />
      <MetricItem label="Max" value={`${data.max} ms`} />
    </div>
  </div>
);

const MetricItem = ({ label, value, highlight = false }: { label: string; value: any; highlight?: boolean }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`font-semibold text-sm ${highlight ? 'text-white' : 'text-gray-300'}`}>{value}</p>
  </div>
);