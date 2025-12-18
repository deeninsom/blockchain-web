
'use client'

import React, { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
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
    harvestDate: new Date().toISOString().slice(0, 10),
    quantity: "",
    unit: "kg",
    photo: null as File | null,
  })

  const resetForm = () => {
    setFormData({
      productName: "",
      location: "",
      harvestDate: new Date().toISOString().slice(0, 10),
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
      const res = await fetch("/api/v1/harvest-log")

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
    router.push(`/admin/harvest-log/${recordId}`)
  }
  return (
    <AdminLayout>
      <div className="space-y-6">



        {formOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Catatan Panen Baru</CardTitle>
              <CardDescription>Masukkan detail panen.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="productName"
                  value={formData.productName}
                  placeholder="Nama Produk (e.g., Beras Pandan Wangi)"
                  onChange={handleChange}
                  disabled={loading}
                />
                <Input
                  name="location"
                  value={formData.location}
                  placeholder="Lokasi Panen (e.g., Blok A)"
                  onChange={handleChange}
                  disabled={loading}
                />
                <Input
                  type="**date**"
                  name="harvestDate"
                  value={formData.harvestDate}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <Input
                    name="quantity"
                    type="number"
                    placeholder="Kuantitas (cth: 400.5)"
                    className="flex-1"
                    value={formData.quantity}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Select
                    onValueChange={(v) => handleSelect(v, "unit")}
                    defaultValue={formData.unit}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ton">ton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PHOTO SECTION */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-primary"
                    disabled={loading}
                  >
                    <Camera className="h-4 w-4 mr-2" /> Ambil Foto
                  </Button>

                  <label
                    htmlFor="photoUpload"
                    className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-md ${loading ? 'bg-secondary/50 text-muted-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                  >
                    Upload dari Galeri
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="photoUpload"
                    disabled={loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhoto(file)
                      e.target.value = ""
                    }}
                  />
                </div>

                {uploadedFileName && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span>**Foto Terpilih**: {uploadedFileName}</span>
                    <Trash
                      className="h-4 w-4 cursor-pointer text-red-500 hover:text-red-700"
                      onClick={handlePhotoClear}
                    />
                  </div>
                )}
              </div>


            </CardContent>
          </Card>
        )}

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
                      <TableHead>Tx</TableHead>
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


    </AdminLayout>
  )
}
