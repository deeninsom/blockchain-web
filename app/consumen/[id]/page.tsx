"use client"

import { useState, useEffect } from "react"
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle2, MapPin, Box, ShieldCheck, ExternalLink, Leaf, Clock, ArrowRight } from 'lucide-react'

// --- Interface Data ---
interface TraceEvent {
  id: string
  txHash: string
  blockTimestamp: string
  locationName: string
  description: string
  eventType: number
  actorRole: string
  notes?: string | null
}

const getStatusConfig = (eventType: number) => {
  switch (eventType) {
    case 1: return { label: "Panen", color: "from-amber-400 to-orange-500", shadow: "shadow-amber-200", icon: <Box className="w-5 h-5" /> };
    case 2: return { label: "Sertifikasi", color: "from-emerald-400 to-teal-600", shadow: "shadow-emerald-200", icon: <ShieldCheck className="w-5 h-5" /> };
    case 3: return { label: "Logistik", color: "from-blue-400 to-indigo-600", shadow: "shadow-blue-200", icon: <MapPin className="w-5 h-5" /> };
    case 5: return { label: "Diterima", color: "from-purple-400 to-fuchsia-600", shadow: "shadow-purple-200", icon: <CheckCircle2 className="w-5 h-5" /> };
    default: return { label: "Proses", color: "from-slate-400 to-slate-600", shadow: "shadow-slate-200", icon: <Loader2 className="w-5 h-5" /> };
  }
}

export default function ConsumerTracePage() {
  const params = useParams();
  const batchId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        const res = await fetch(`/api/v1/logistic/history/${batchId}`);
        if (!res.ok) throw new Error("Data tidak ditemukan");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrace();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
        </div>
        <p className="mt-4 font-medium text-slate-500 animate-pulse">Menghubungkan ke Ledger...</p>
      </div>
    );
  }

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <Card className="max-w-md border-none shadow-2xl bg-slate-50">
        <CardContent className="pt-12 pb-12 text-center">
          <Box className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Batch Tidak Ditemukan</h2>
          <p className="text-slate-500 mt-2 text-sm">Informasi untuk ID <span className="font-mono text-primary font-bold">{batchId}</span> belum tersedia.</p>
        </CardContent>
      </Card>
    </div>
  );

  const currentStatus = getStatusConfig(data.events[0]?.eventType || 0);

  return (
    <div className="min-h-screen bg-[#FBFDFF] pb-20 font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/10 to-transparent -z-10" />
      <div className="absolute top-20 right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Header Section */}
      <div className="pt-12 pb-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-primary/10 shadow-sm mb-6 animate-in fade-in slide-in-from-top duration-700">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Blockchain Verified Report</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Lacak Kesegaran <br /><span className="text-primary underline decoration-primary/20 italic">Produk Anda</span>
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
          Setiap langkah perjalanan produk ini telah terekam secara permanen di jaringan Blockchain untuk menjamin transparansi penuh.
        </p>
      </div>

      <div className="max-w-2xl mx-auto -mt-12 px-6">
        {/* Main Product Card */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-none rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-xl">
          <CardHeader className="text-center bg-white p-8 border-b border-slate-50">
            <div className="mx-auto w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-4">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">{data.productName}</CardTitle>
            <div className="inline-block mt-2 bg-slate-100 px-3 py-1 rounded-md">
              <span className="font-mono text-[11px] font-bold text-slate-500 tracking-tighter uppercase">ID BATCH: {data.batchId}</span>
            </div>
          </CardHeader>

          <CardContent className="p-8 md:p-10">
            <div className="relative space-y-12">
              {/* Timeline Line with Gradient */}
              <div className="absolute left-[23px] top-4 bottom-4 w-[3px] bg-gradient-to-b from-primary/30 via-slate-100 to-slate-50" />

              {data.events.slice().reverse().map((event: TraceEvent, idx: number) => {
                const config = getStatusConfig(event.eventType);
                const isLatest = idx === 0;

                return (
                  <div key={event.id} className={`relative pl-16 group transition-all ${isLatest ? 'scale-100' : 'opacity-80 hover:opacity-100'}`}>

                    {/* Status Dot/Icon */}
                    <div className={`absolute left-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${config.color} ${config.shadow} text-white flex items-center justify-center z-10 border-4 border-white transition-transform group-hover:scale-110 duration-300`}>
                      {config.icon}
                      {isLatest && <div className="absolute -inset-1 bg-inherit rounded-2xl blur-md opacity-40 animate-pulse -z-10" />}
                    </div>

                    <div className={`rounded-[1.5rem] p-6 transition-all border ${isLatest ? 'bg-white border-primary/10 shadow-xl' : 'bg-white/40 border-slate-100 shadow-sm'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <Badge className={`bg-gradient-to-r ${config.color} text-[10px] uppercase font-bold tracking-widest border-none px-3 py-1`}>
                          {config.label}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[11px] font-bold">
                            {new Date(event.blockTimestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-800 text-lg mb-1">{event.locationName}</h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{event.description}</p>

                      {event.notes && (
                        <div className="mt-4 flex gap-3 items-start bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <span className="text-xl text-primary/40 leading-none">“</span>
                          <p className="text-[12px] italic text-slate-600 font-medium">{event.notes}</p>
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verifikator</span>
                          <span className="text-[11px] font-black text-slate-700">{event.actorRole}</span>
                        </div>
                        {/* <a
                          href={`http://public-tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link flex items-center gap-2 bg-slate-100 hover:bg-primary hover:text-white transition-colors px-3 py-2 rounded-lg text-[10px] font-bold text-slate-600"
                        >
                          BUKTI BLOCKCHAIN <ExternalLink className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                        </a> */}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer Brand */}
        <div className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-4 opacity-30 grayscale">
            <ShieldCheck className="w-6 h-6" />
            <ArrowRight className="w-4 h-4" />
            <Leaf className="w-6 h-6" />
          </div>
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
            Infrastruktur Ledger oleh PT. BOS FRESH Indonesia
          </p>
        </div>
      </div>
    </div>
  )
}