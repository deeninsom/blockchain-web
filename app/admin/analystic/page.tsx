"use client"
import { AdminLayout } from '@/components/admin/admin-layout';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

export default function PerformanceLab() {
  const [dbData, setDbData] = useState({ batches: [], users: [] });
  const [form, setForm] = useState({ throughput: 5, duration: 3, batchId: '', userId: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/benchmark/setup').then(res => res.json()).then(setDbData);
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

  return (
    <AdminLayout>
      <div className="min-h-screen  text-white p-10">
        <h1 className="text-3xl font-bold mb-2">Blockchain Performance Lab</h1>
        <p className="text-gray-400 mb-8">PT. BOS Fresh Performance Analysis (ETH vs HLF)</p>

        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4  p-6 rounded-xl mb-8 border border-gray-700">
          <div>
            <label className="text-xs text-gray-400">Select Real Batch</label>
            <select className="w-full bg-gray-700 p-2 rounded mt-1" onChange={e => setForm({ ...form, batchId: e.target.value })}>
              <option value="">-- Choose Batch --</option>
              {dbData.batches.map(b => <option key={b.id} value={b.id}>{b.batchId} - {b.productName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Select Actor (User)</label>
            <select className="w-full bg-gray-700 p-2 rounded mt-1" onChange={e => setForm({ ...form, userId: e.target.value })}>
              <option value="">-- Choose User --</option>
              {dbData.users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Throughput (tx/sec)</label>
            <input type="number" className="w-full bg-gray-700 p-2 rounded mt-1" value={form.throughput} onChange={e => setForm({ ...form, throughput: e.target.value })} />
          </div>
          <button onClick={handleRunTest} disabled={loading || !form.batchId} className="bg-primary hover:bg-blue-700 rounded h-11 mt-5 font-bold transition">
            {loading ? "Testing..." : "Execute Analysis"}
          </button>
        </div>

        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart TPS */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Throughput Comparison (TPS)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Ethereum', tps: results.ethereum.tps },
                    { name: 'Hyperledger', tps: results.hyperledger.tps }
                  ]}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937' }} />
                    <Bar dataKey="tps" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Latency */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">Latency Analysis (p50 & p95) ms</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Avg', eth: results.ethereum.avg, hlf: results.hyperledger.avg },
                    { name: 'p50', eth: results.ethereum.p50, hlf: results.hyperledger.p50 },
                    { name: 'p95', eth: results.ethereum.p95, hlf: results.hyperledger.p95 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937' }} />
                    <Legend />
                    <Line type="monotone" dataKey="eth" stroke="#818cf8" name="Ethereum" strokeWidth={2} />
                    <Line type="monotone" dataKey="hlf" stroke="#10b981" name="Hyperledger" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}