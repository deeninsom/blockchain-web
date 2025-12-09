
'use client'

import React, { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useNotification } from "@/lib/notification-context"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { CameraCapture } from "@/components/farmer/camera-capture"
import {
  Camera, Trash, CheckCircle, Clock, Check, Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"

type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";
interface HarvestRecord {
  id: string,
  batchId: string,
  productName: string,
  location: string
  harvestDate: string
  quantity: string
  unit: string
  photoIpfsHash: string
  txHash: string | null
  ipfsHash: string
  status: RecordStatus
  createdAt: string
}

const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const config = {
    PENDING: { // Menunggu Review Admin
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Menunggu Review",
      color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    REJECTED: { // Ditolak Admin
      icon: <Trash className="h-4 w-4 mr-1" />,
      text: "Ditolak Admin",
      color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
    },
    VERIFIED: { // Diverifikasi Admin (Siap ke Blockchain)
      icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />, // Mengubah ini menjadi loader karena biasanya ini adalah state perantara sebelum CONFIRMED
      text: "Diverifikasi (Proses TX)",
      color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    CONFIRMED: { // Sudah di Blockchain (Final)
      icon: <CheckCircle className="h-4 w-4 mr-1" />,
      text: "Blockchain Confirmed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400",
    },
  }

  // Pastikan status adalah salah satu kunci yang valid
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

export default function RecordHarvestPage() {
  const router = useRouter()
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<HarvestRecord[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productName: "",
    location: "",
    harvestDate: new Date().toISOString().slice(0, 16),
    quantity: "",
    unit: "kg",
    photo: null as File | null,
  })

  const resetForm = () => {
    setFormData({
      productName: "",
      location: "",
      harvestDate: new Date().toISOString().slice(0, 16),
      quantity: "",
      unit: "kg",
      photo: null,
    });
    setUploadedFileName(null);
    setFormOpen(false);
  };

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      // ASUMSI: API endpoint baru yang telah disesuaikan dengan POST di atas
      const res = await fetch("/api/v1/harvest/record")

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal mengambil data riwayat panen");
      }

      const json = await res.json()

      // FIX: Mengakses properti 'records' yang dikembalikan oleh API GET yang baru.
      const rawRecords = json.records || []

      const formatted = rawRecords.map((r: any): HarvestRecord => ({
        id: r.id,
        batchId: r.batchId,
        location: r.location,
        harvestDate: new Date(r.harvestDate).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }),
        productName: r.productName || 'N/A',
        quantity: parseFloat(r.quantity || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: r.unit,
        photoIpfsHash: r.photoIpfsHash,
        txHash: r.txHash,
        ipfsHash: r.ipfsHash,
        status: r.status,
        createdAt: new Date(r.createdAt).toLocaleDateString("id-ID")
      }))

      setRecords(formatted)
    } catch (err: any) {
      console.error("Fetch Error:", err);
      addNotification("Error", err.message || "Gagal memuat data panen", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])


  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelect = (value: string, key: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  const handlePhoto = (file: File) => {
    setFormData(prev => ({ ...prev, photo: file }))
    setUploadedFileName(file.name)
    setIsCameraOpen(false)
  }

  const handlePhotoClear = () => {
    setFormData(prev => ({ ...prev, photo: null }))
    setUploadedFileName(null)
  }



  const handleRowClick = (recordId: string) => {
    router.push(`/dashboard/panen/data-panen/${recordId}`)
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Record Harvest</h1>
            <p className="text-muted-foreground mt-2">
              Catat data panen Anda untuk sistem ketertelusuran.
            </p>
          </div>


        </div>



        {/* RIWAYAT TABLE */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Panen</CardTitle>
            <CardDescription>Daftar catatan panen yang telah Anda kirim ke sistem.</CardDescription>
          </CardHeader>

          <CardContent>
            {loading && records.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat Riwayat...
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Belum ada catatan panen yang dibuat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow >
                      <TableHead>Batch</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Tanggal Panen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Blockchain</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id} onClick={() => handleRowClick(r.id)}>
                        <TableCell className="font-medium">{r.batchId}</TableCell>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell>{r.location}</TableCell>
                        <TableCell>{r.quantity} {r.unit}</TableCell>
                        <TableCell>{r.harvestDate}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          {r.txHash ? (
                            <a
                              href={`/explorer/tx/${r.txHash}`} // ASUMSI: link ke explorer Anda
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline truncate w-20 inline-block"
                            >
                              {r.txHash.substring(0, 6)}...
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">Waiting TX</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CAMERA COMPONENT */}
      {isCameraOpen && (
        <CameraCapture
          onCapture={handlePhoto}
          onClose={() => setIsCameraOpen(false)}
        />
      )}


    </DashboardLayout>
  )
}
