"use client"

import { useState, useEffect } from "react"
import { OperatorLayout } from "@/components/operator/operator-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from 'lucide-react';

// --- Tipe Data Disesuaikan dengan Skema Blockchain/Prisma ---
interface TraceEvent {
    id: string
    txHash: string
    ipfsHash: string
    blockTimestamp: string
    locationName: string
    description: string
    eventType: 1 | 2 | 3 | 5
    actorRole: 'FARMER' | 'CENTRAL_OPERATOR' | 'RETAIL_OPERATOR' | 'QA_ADMIN'
    gpsCoordinates?: string
    notes?: string
}

// Helper untuk Badge Status
const getStatusBadge = (eventType: number) => {
    switch (eventType) {
        case 1: // HARVEST
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Panen</Badge>;
        case 2: // CERTIFICATION
            return <Badge variant="default" className="bg-green-100 text-green-800">Verifikasi</Badge>;
        case 3: // PICKED
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Dimuat</Badge>;
        case 5: // RECEIVED
            return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Diterima</Badge>;
        default:
            return <Badge variant="secondary">Proses</Badge>;
    }
}

// --- Komponen Utama ---

export default function TrackingHistoryPage() {

    const [trackingBatchId, setTrackingBatchId] = useState("PN-XYZ-20250110");
    const [events, setEvents] = useState<TraceEvent[]>([
        // Mock Data
        {
            id: "1",
            txHash: "0x123abc...def789",
            ipfsHash: "QmHash1xyz...",
            blockTimestamp: "2024-01-15T10:30:00Z", // Pastikan format ISO
            locationName: "Gudang Petani (Farm Jakarta)",
            description: "Pencatatan Panen Pertama",
            eventType: 1,
            actorRole: 'FARMER',
        },
        {
            id: "2",
            txHash: "0x456def...abc012",
            ipfsHash: "QmHash2jkl...",
            blockTimestamp: "2024-01-15T14:20:00Z", // Pastikan format ISO
            locationName: "Gudang Petani",
            description: "Pengiriman (PICKED) menuju Pusat Distribusi",
            eventType: 3,
            actorRole: 'FARMER',
            gpsCoordinates: "-6.201, 106.812",
            notes: "Kualitas barang sesuai standar B.",
        },
        {
            id: "3",
            txHash: "0x789ghi...def345",
            ipfsHash: "QmHash3pqr...",
            blockTimestamp: "2024-01-16T09:00:00Z", // Pastikan format ISO
            locationName: "Pusat Distribusi Bandung",
            description: "Barang Diterima (RECEIVED) dan diverifikasi",
            eventType: 5,
            actorRole: 'CENTRAL_OPERATOR',
            gpsCoordinates: "-6.903, 107.619",
            notes: "Serah terima berhasil, siap untuk sorting.",
        },
    ]);
    const [loading, setLoading] = useState(false);

    // Fungsi fetch data sesungguhnya
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            // SIMULASI FETCH (ganti dengan kode API Anda)
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLoading(false);
        };
        if (trackingBatchId) {
            fetchEvents();
        }
    }, [trackingBatchId]);


    // Fungsi helper untuk memformat tanggal secara konsisten
    const formatConsistentDateTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            // Menggunakan opsi yang eksplisit dan locale 'id-ID' untuk konsistensi.
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
            console.error("Invalid date format", timestamp);
            return timestamp; // Kembalikan nilai asli jika gagal
        }
    };


    return (
        <OperatorLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Traceability Logistik</h1>
                        <p className="text-muted-foreground mt-1">Lacak perjalanan Batch ID: **{trackingBatchId}**</p>
                    </div>
                    <Button variant="outline" disabled={loading}>
                        {loading ? "Memuat..." : "Refresh Data"}
                    </Button>
                </div>

                {/* Timeline */}
                <Card className="bg-card/50 backdrop-blur border-border">
                    <CardHeader>
                        <CardTitle>Timeline Verifikasi Produk</CardTitle>
                        <CardDescription>Semua event on-chain yang tercatat.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center p-8 text-gray-500">Memuat data transaksi...</div>
                        ) : (
                            <div className="space-y-8">
                                {/* Menggunakan reverse untuk menampilkan yang terbaru di atas */}
                                {events.slice().reverse().map((event, index) => (
                                    <div key={event.id} className="flex gap-4">
                                        {/* Visual Timeline Bar */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20" />
                                            {index < events.length - 1 && <div className="w-0.5 h-24 bg-border mt-2" />}
                                        </div>

                                        {/* Detail Event Card */}
                                        <div className="flex-1 pb-6 border-b border-dashed border-border/50">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(event.eventType)}
                                                        <Badge variant="secondary">{event.actorRole}</Badge>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-foreground mt-1">{event.locationName}</h3>
                                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                                    {/* BARIS PERBAIKAN DI SINI */}
                                                    <p className="text-xs text-muted-foreground mt-1">{formatConsistentDateTime(event.blockTimestamp)}</p>
                                                </div>
                                            </div>

                                            {/* Detail Bukti On-Chain dan IPFS */}
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-1">
                                                {/* Detail Logistik (Hanya ada jika PICKED/RECEIVED) */}
                                                {event.gpsCoordinates && (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        **GPS:** {event.gpsCoordinates}
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
                                                    // Arahkan ke explorer untuk verifikasi
                                                    onClick={() => window.open(`https://explorer.yourchain.com/tx/${event.txHash}`, '_blank')}
                                                >
                                                    <Link className="w-3 h-3 mr-1" /> Lihat Bukti On-Chain
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </OperatorLayout>
    )
}