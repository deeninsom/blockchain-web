'use client'

import React, { useState, useEffect, useCallback } from "react"
// Menggunakan OperatorLayout sesuai dengan peran pengguna
import { OperatorLayout } from "@/components/operator/operator-layout"
import { useNotification } from "@/lib/notification-context"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Truck, CheckCircle, Clock, Loader2, Package, XCircle
} from "lucide-react"
import { useRouter } from "next/navigation"

// Tipe data disesuaikan untuk kebutuhan Tracking Logistik
type TrackingStatus = "HARVESTED" | "VERIFIED" | "PICKED" | "PROCESSED" | "SOLD";

// Interface disesuaikan agar sesuai dengan data yang dikembalikan oleh API Logistik
interface TrackingRecord {
    id: string,
    batchId: string,
    productName: string,
    // Data berikut disimulasikan, karena di API nyata, ini diambil dari IPFS hash
    quantityDisplay: string,
    unit: string,
    // Data yang benar-benar dikembalikan dari API Logistik
    dataIpfsHash: string,
    pickedBy: string,
    pickedAt: string,
    farmerName: string,
    harvestDate: string,
    currentStatus: "PICKED" | TrackingStatus // Status terbaru dalam rantai pasok
}

// Komponen Badge Status (Tidak berubah, sudah bagus)
const StatusBadge: React.FC<{ status: TrackingStatus }> = ({ status }) => {
    const config = {
        HARVESTED: { icon: <Package className="h-4 w-4 mr-1" />, text: "Panen Dicatat", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300", },
        VERIFIED: { icon: <CheckCircle className="h-4 w-4 mr-1" />, text: "Verifikasi Admin", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400", },
        PICKED: { icon: <Truck className="h-4 w-4 mr-1" />, text: "Siap Kirim (Diambil)", color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400", },
        PROCESSED: { icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />, text: "Sedang Diproses", color: "text-orange-700 bg-orange-100 dark:bg-orange-900/50 dark:text-orange-400", },
        SOLD: { icon: <CheckCircle className="h-4 w-4 mr-1" />, text: "Terjual (Selesai)", color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400", },
    }

    const statusKey = status as keyof typeof config;
    if (!config[statusKey]) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">Status Unknown</span>
    }
    const { icon, text, color } = config[statusKey]
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {icon}
            {text}
        </span>
    )
}

// Komponen Utama
export default function TrackingListPage() {
    const router = useRouter()
    const { addNotification } = useNotification()
    const [records, setRecords] = useState<TrackingRecord[]>([])
    const [loading, setLoading] = useState(false)

    // PERBAIKAN 1: Menggunakan API Endpoint Logistik
    const API_ENDPOINT = "/api/v1/logistic"

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true)

            const res = await fetch(API_ENDPOINT)

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Gagal mengambil data batch siap kirim.");
            }

            const json = await res.json()

            // PERBAIKAN 2: Menggunakan properti 'batches' dari respons API baru
            const rawRecords = json.batches || []

            const formatted: TrackingRecord[] = rawRecords.map((r: any): TrackingRecord => {
                console.log(r)
                // Simulasi data Kuantitas yang seharusnya diambil dari IPFS Hash (r.dataIpfsHash)
                const mockQuantity = Math.floor(Math.random() * (500 - 100 + 1) + 100);
                const mockUnit = "kg";

                return {
                    id: r.id,
                    batchId: r.batchId,
                    productName: r.productName || 'N/A',
                    quantityDisplay: r.quantity,
                    unit: mockUnit,
                    currentStatus: "PICKED",
                    dataIpfsHash: r.dataIpfsHash || 'N/A',
                    pickedBy: r.pickedBy || 'N/A',
                    pickedAt: new Date(r.pickedAt).toLocaleDateString("id-ID"),
                    farmerName: r.farmerName || 'N/A',
                    harvestDate: new Date(r.harvestDate).toLocaleDateString("id-ID"),
                }
            })

            setRecords(formatted)
        } catch (err: any) {
            console.error("Fetch Error:", err);
            addNotification("Error", err.message || "Gagal memuat data batch siap kirim", "error")
        } finally {
            setLoading(false)
        }
    }, [addNotification])

    useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    const handleRowClick = (recordId: string) => {
        // PERBAIKAN 3: Navigasi ke halaman detail *record-shipment*
        router.push(`/operator/tracking/${recordId}`)
    }

    return (
        <OperatorLayout>
            <div className="space-y-6">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Truck className="h-7 w-7" /> Batch Siap Dicatat Pengiriman
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Daftar batch
                        </p>
                    </div>

                    {/* Button refresh data */}
                    <Button onClick={fetchRecords} disabled={loading} variant="outline" className="text-primary">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Refresh Data"}
                    </Button>
                </div>

                {/* RIWAYAT TABLE */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Batch Siap Kirim</CardTitle>
                        <CardDescription>
                            Batch di bawah ini telah diambil dari petani. Klik baris untuk mencatat lokasi pengiriman.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {loading && records.length === 0 ? (
                            <div className="flex items-center justify-center py-10 text-muted-foreground">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat Daftar Batch...
                            </div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                Tidak ada batch yang berstatus PICKED dan siap dicatat pengirimannya.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Batch ID</TableHead>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Quantity</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {records.map((r) => (
                                            <TableRow
                                                key={r.id}
                                                onClick={() => handleRowClick(r.id)}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell className="font-medium">{r.batchId}</TableCell>
                                                <TableCell>{r.productName}</TableCell>
                                                <TableCell>{r.quantityDisplay} {r.unit}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </OperatorLayout>
    )
}