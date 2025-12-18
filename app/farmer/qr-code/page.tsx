'use client'

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useNotification } from "@/lib/notification-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, QrCode, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from 'qrcode.react'
import { FarmerLayout } from "@/components/farmer/farmer-layout"

interface HarvestRecord {
  id: string
  batchId: string
  productName: string
  harvestDate: string
  status: string
}

export default function QRGeneratorPage() {
  const router = useRouter()
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<HarvestRecord[]>([])
  const [loading, setLoading] = useState(false)
  const hasFetched = useRef(false)

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/v1/qr-code", { cache: 'no-store' })
      if (!res.ok) throw new Error("Gagal mengambil data")
      const json = await res.json()
      const rawData: HarvestRecord[] = json.records || []

      // Menjamin keunikan data berdasarkan batchId agar tidak dobel saat print
      const uniqueMap = new Map()
      rawData.forEach(item => {
        if (!uniqueMap.has(item.batchId)) {
          uniqueMap.set(item.batchId, item)
        }
      })
      setRecords(Array.from(uniqueMap.values()))
    } catch (err: any) {
      addNotification("Error", "Gagal memuat data", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    if (!hasFetched.current) {
      fetchRecords()
      hasFetched.current = true
    }
  }, [fetchRecords])

  const handlePrint = () => {
    window.print()
  }

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header - Disembunyikan saat print */}
        <div className="flex justify-between items-center print:hidden border-b pb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cetak Label QR</h1>
              <p className="text-muted-foreground">Siapkan label fisik untuk ditempel pada packaging.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { hasFetched.current = false; fetchRecords(); }} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={handlePrint} className="bg-primary flex items-center gap-2" disabled={records.length === 0 || loading}>
              <Printer className="h-4 w-4" /> Cetak Label ({records.length})
            </Button>
          </div>
        </div>

        {/* Container Label - Dioptimalkan untuk layar dan kertas */}
        <div className="qr-print-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p>Memproses label...</p>
            </div>
          ) : records.map((r) => (
            <Card key={r.id} className="qr-card overflow-hidden border-2 border-slate-200 shadow-sm break-inside-avoid">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="bg-white p-2 border rounded-md mb-3">
                  <QRCodeSVG value={`${window.location.origin}/consumen/${r.batchId}`} size={130} level="H" />
                </div>
                <div className="text-center w-full space-y-1">
                  <p className="font-mono text-[10px] font-black bg-slate-100 py-1 rounded tracking-tighter">
                    {r.batchId}
                  </p>
                  <p className="text-sm font-bold uppercase truncate">{r.productName}</p>
                  <div className="flex items-center justify-between text-[8px] text-slate-500 mt-2 border-t pt-2 uppercase font-semibold">
                    <span>PT. BOS FRESH</span>
                    <span>{new Date(r.harvestDate).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* 1. Hilangkan elemen UI Web */
          header, nav, aside, footer, 
          .print\:hidden, 
          button, 
          [role="navigation"] { 
            display: none !important; 
          }

          /* 2. Reset Layout Main agar memenuhi halaman */
          main, .container, div { 
            margin: 0 !important; 
            padding: 0 !important; 
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* 3. Atur Grid khusus Cetak (A4 biasanya muat 3 kolom) */
          .qr-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 5mm !important;
            padding: 10mm !important;
          }

          /* 4. Styling Card saat dicetak */
          .qr-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: auto !important;
          }

          /* 5. Pengaturan Halaman */
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </FarmerLayout>
  )
}