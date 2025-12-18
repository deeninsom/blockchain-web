"use client"

import { useState, useEffect } from "react"
import { useParams } from 'next/navigation'
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link as LinkIcon, ArrowLeft, Loader2 } from 'lucide-react'; // Tambahkan Loader2
import NextLink from 'next/link';
import { useNotification } from "@/lib/notification-context" // Import useNotification

// --- Tipe Data Disesuaikan dengan Respons API Baru ---
interface TraceEvent {
  id: string
  txHash: string
  ipfsHash: string
  blockTimestamp: string // Datetime string ISO 8601
  locationName: string
  description: string
  eventType: number // Numerik (1, 2, 3, 5, dll.)
  actorRole: string // Role diisi dari User.role
  gpsCoordinates?: string | null
  notes?: string | null
}

interface BatchDetail {
  batchId: string,
  productName: string,
  events: TraceEvent[]
}

// Helper untuk Badge Status
const getStatusBadge = (eventType: number) => {
  switch (eventType) {
    case 1: // HARVEST
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Panen</Badge>;
    case 2: // CERTIFICATION / VERIFICATION
      return <Badge variant="default" className="bg-green-100 text-green-800">Verifikasi</Badge>;
    case 3: // PICKED
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Dimuat (PICKED)</Badge>;
    case 5: // RECEIVED
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Diterima (RECEIVED)</Badge>;
    default:
      return <Badge variant="secondary">Proses ({eventType})</Badge>;
  }
}

// Fungsi helper untuk memformat tanggal secara konsisten
const formatConsistentDateTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const datePart = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timePart = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return `${datePart}, ${timePart}`;
  } catch (e) {
    return timestamp;
  }
};

// --- Komponen Utama Detail ---
export default function TrackingDetailPage() {

  const params = useParams();
  const internalBatchId = params.id as string;

  const { addNotification } = useNotification();
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi fetch data sesungguhnya
  useEffect(() => {
    if (!internalBatchId) {
      setLoading(false);
      return;
    }

    const API_ENDPOINT = `/api/v1/logistic/history/${internalBatchId}`;

    const fetchEvents = async () => {
      setLoading(true);

      try {
        const res = await fetch(API_ENDPOINT);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Gagal mengambil data detail tracking.");
        }

        const json = await res.json();

        setDetail({
          batchId: json.batchId || "N/A",
          productName: json.productName || "Produk Tidak Dikenal",
          events: json.events || []
        });

      } catch (error: any) {
        console.error("Fetch Error:", error);
        addNotification("Error", error.message || "Terjadi kesalahan saat memuat riwayat batch.", "error");
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [internalBatchId, addNotification]);

  const currentBatchIdDisplay = detail?.batchId || internalBatchId;
  // Data events sudah diurutkan kronologis di backend. Reverse di frontend untuk Tampilan Terbaru di Atas.
  const reversedEvents = detail?.events.slice().reverse() || [];

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detail Tracking product</h1>
            <p className="text-muted-foreground mt-1">
              Lacak perjalanan Batch ID: **{currentBatchIdDisplay}** ({detail?.productName || '...'})
            </p>
          </div>
          <NextLink href="/farmer/tracking" passHref>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
            </Button>
          </NextLink>
        </div>

        {/* Timeline */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Timeline Verifikasi Produk</CardTitle>
            <CardDescription>Semua event on-chain yang tercatat.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center p-8 text-gray-500 flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memuat data transaksi...
              </div>
            ) : reversedEvents.length === 0 ? (
              <div className="text-center p-8 text-gray-500 border border-gray-300 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Tidak Ada Riwayat</h3>
                <p className="text-sm">Batch ID **{currentBatchIdDisplay}** tidak ditemukan atau belum memiliki catatan trace.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {reversedEvents.map((event, index) => {
                  // Hitung index asli dalam array awal untuk menentukan apakah ini item terakhir
                  const originalIndex = reversedEvents.length - 1 - index;
                  return (
                    <div key={event.id} className="flex gap-4">
                      {/* Visual Timeline Bar */}
                      <div className="flex flex-col items-center">
                        {/* Titik utama selalu ada */}
                        <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20" />
                        {/* Garis konektor, tidak ada di item terakhir (yang ditampilkan di bawah) */}
                        {originalIndex !== 0 && <div className="w-0.5 h-24 bg-border mt-2" />}
                      </div>

                      {/* Detail Event Card */}
                      <div className="flex-1 pb-6 border-b border-dashed border-border/50 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(event.eventType)}
                              <Badge variant="secondary">{event.actorRole}</Badge>
                            </div>
                            <h3 className="font-bold text-lg text-foreground mt-1">{event.locationName}</h3>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatConsistentDateTime(event.blockTimestamp)}</p>
                          </div>
                        </div>

                        {/* Detail Bukti On-Chain dan IPFS */}
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-1">
                          {/* Detail Logistik (Hanya ada jika GPS/Notes ada) */}
                          {event.gpsCoordinates && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              **GPS:** <a
                                // Link ke Google Maps menggunakan koordinat
                                href={`https://www.google.com/maps/search/?api=1&query=${event.gpsCoordinates}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {event.gpsCoordinates} (Lihat Peta)
                              </a>
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              **Catatan:** {event.notes}
                            </p>
                          )}

                          {/* Bukti Imutabilitas */}
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            **Tx Hash:** {event.txHash}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            **IPFS Hash:** {event.ipfsHash}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-4 p-0 text-primary hover:underline"
                            // Ganti dengan link Block Explorer yang sebenarnya
                            onClick={() => window.open(`http://public-tx/${event.txHash}`, '_blank')}
                          >
                            <LinkIcon className="w-3 h-3 mr-1" /> Lihat Bukti On-Chain
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmerLayout>
  )
}