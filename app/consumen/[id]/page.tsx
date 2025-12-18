"use client"

import { useState, useEffect } from "react"
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle2, MapPin, Box, ShieldCheck, ExternalLink } from 'lucide-react'

// --- Interface Data ---
interface TraceEvent {
  id: string
  txHash: string
  ipfsHash: string
  blockTimestamp: string
  locationName: string
  description: string
  eventType: number
  actorRole: string
  notes?: string | null
}

const getStatusConfig = (eventType: number) => {
  switch (eventType) {
    case 1: return { label: "Panen", color: "bg-amber-500", icon: <Box className="w-4 h-4" /> };
    case 2: return { label: "Tersertifikasi", color: "bg-emerald-500", icon: <ShieldCheck className="w-4 h-4" /> };
    case 3: return { label: "Dalam Pengiriman", color: "bg-blue-500", icon: <MapPin className="w-4 h-4" /> };
    case 5: return { label: "Tiba di Tujuan", color: "bg-purple-500", icon: <CheckCircle2 className="w-4 h-4" /> };
    default: return { label: "Proses", color: "bg-slate-500", icon: <Loader2 className="w-4 h-4" /> };
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10">
            <h2 className="text-xl font-bold text-slate-800">Batch Tidak Ditemukan</h2>
            <p className="text-slate-500 mt-2">Maaf, informasi untuk ID {batchId} belum tersedia atau tidak valid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Hero Header */}
      <div className="bg-primary text-primary-foreground py-12 px-4 text-center shadow-lg">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Traceability Report</h1>
        <p className="mt-2 text-primary-foreground/80 max-w-xl mx-auto">
          Verifikasi keaslian dan kesegaran produk Anda melalui catatan Blockchain yang tidak dapat diubah.
        </p>
      </div>

      <div className="max-w-2xl mx-auto -mt-8 px-4">
        {/* Info Utama Produk */}
        <Card className="shadow-xl border-none">
          <CardHeader className="text-center border-b bg-white rounded-t-xl">
            <CardTitle className="text-2xl font-black text-primary">{data.productName}</CardTitle>
            <CardDescription className="font-mono font-bold">BATCH ID: {data.batchId}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-8 relative">
              {/* Garis Vertikal Timeline */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200" />

              {data.events.slice().reverse().map((event: TraceEvent, idx: number) => {
                const config = getStatusConfig(event.eventType);
                return (
                  <div key={event.id} className="relative pl-12">
                    {/* Icon Penanda */}
                    <div className={`absolute left-0 w-10 h-10 rounded-full ${config.color} text-white flex items-center justify-center shadow-md z-10 border-4 border-white`}>
                      {config.icon}
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`${config.color} hover:${config.color} border-none`}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          {new Date(event.blockTimestamp).toLocaleDateString('id-ID')}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-800">{event.locationName}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>

                      {event.notes && (
                        <p className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-2 rounded">
                          "{event.notes}"
                        </p>
                      )}

                      <Separator className="my-3 opacity-50" />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Verified by {event.actorRole}</span>
                        <a
                          href={`http://public-tx/${event.txHash}`}
                          target="_blank"
                          className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
                        >
                          BLOCKCHAIN PROOF <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-[10px] mt-8 uppercase tracking-widest font-medium">
          Powered by PT. BOS FRESH Blockchain System
        </p>
      </div>
    </div>
  )
}