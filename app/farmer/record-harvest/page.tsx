"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
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
  Camera, Trash, CheckCircle, Clock, Check, Loader2,
} from "lucide-react"


/* -------------------------------------------------------------------------- */
/*                                TYPES MODEL                                 */
/* -------------------------------------------------------------------------- */

interface HarvestRecord {
  id: string
  batchNumber: string
  location: string
  harvestDate: string
  quantity: string
  unit: string
  photos: string[]
  txHash?: string
  ipfsHash?: string
  status: "pending" | "submitted" | "confirmed"
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*                              STATUS COMPONENT                              */
/* -------------------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: HarvestRecord["status"] }> = ({ status }) => {
  const config = {
    pending: {
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Pending",
      color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    submitted: {
      icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />,
      text: "Submitted",
      color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400",
    },
    confirmed: {
      icon: <Check className="h-4 w-4 mr-1" />,
      text: "Confirmed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400",
    },
  }

  const { icon, text, color } = config[status]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {text}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  MAIN PAGE                                 */
/* -------------------------------------------------------------------------- */

export default function RecordHarvestPage() {
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<HarvestRecord[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    batchNumber: "",
    location: "",
    harvestDate: new Date().toISOString().slice(0, 16),
    quantity: "",
    unit: "kg",
    photo: null as File | null,
  })


  /* -------------------------------------------------------------------------- */
  /*                              FETCH RECORDS API                             */
  /* -------------------------------------------------------------------------- */
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch("/api/v1/harvest/record")
      if (!res.ok) throw new Error("Gagal mengambil data")

      const json = await res.json()

      const formatted = json.records.map((r: any): HarvestRecord => ({
        id: r.id,
        batchNumber: r.batch.batchNumber,
        location: r.location,
        harvestDate: new Date(r.harvestDate).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }),
        quantity: parseFloat(r.quantity).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: r.unit,
        photos: r.photos?.map((p: any) => p.url) ?? [],
        txHash: r.tx?.txHash,
        ipfsHash: r.ipfs?.ipfsHash,
        status: r.txHash ? "confirmed" : "submitted",
        createdAt: new Date(r.createdAt).toLocaleDateString("id-ID")
      }))

      setRecords(formatted)
    } catch (err) {
      addNotification("Error", "Gagal memuat data panen", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])


  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])


  /* -------------------------------------------------------------------------- */
  /*                                FORM HANDLER                                */
  /* -------------------------------------------------------------------------- */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelect = (value: string, key: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  const handlePhoto = (file: File) => {
    setFormData(prev => ({ ...prev, photo: file }))
    setIsCameraOpen(false)
  }

  const submitHarvest = async () => {
    if (!formData.batchNumber || !formData.location || !formData.quantity) {
      addNotification("Error", "Semua field wajib diisi", "error")
      return
    }

    if (!formData.photo) {
      addNotification("Error", "Tambahkan satu foto panen", "error")
      return
    }

    const fd = new FormData()
    fd.append("batchNumber", formData.batchNumber)
    fd.append("location", formData.location)
    fd.append("harvestDate", new Date(formData.harvestDate).toISOString())
    fd.append("quantity", formData.quantity)
    fd.append("unit", formData.unit)
    fd.append("photo", formData.photo)

    try {
      setLoading(true)

      const res = await fetch("/api/v1/harvest/record", {
        method: "POST",
        body: fd,
      })

      const result = await res.json()
      if (!res.ok) {
        addNotification("Error", result.message, "error")
        return
      }

      await fetchRecords()
      setFormOpen(false)

      addNotification("Success", "Data berhasil dikirim", "success")
    } finally {
      setLoading(false)
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER UI                                 */
  /* -------------------------------------------------------------------------- */

  return (
    <FarmerLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Record Harvest</h1>
            <p className="text-muted-foreground mt-2">
              Catat data panen Anda untuk sistem ketertelusuran.
            </p>
          </div>

          <Button onClick={() => setFormOpen(true)} className="bg-primary">
            + Catat Panen Baru
          </Button>
        </div>

        {/* FORM */}
        {formOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Catatan Panen Baru</CardTitle>
              <CardDescription>Masukkan detail panen.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* FORM INPUTS */}
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  name="batchNumber"
                  value={formData.batchNumber}
                  placeholder="Batch Number"
                  onChange={handleChange}
                />
                <Input
                  name="location"
                  value={formData.location}
                  placeholder="Lokasi"
                  onChange={handleChange}
                />
                <Input
                  type="datetime-local"
                  name="harvestDate"
                  value={formData.harvestDate}
                  onChange={handleChange}
                />
                <div className="flex gap-2">
                  <Input
                    name="quantity"
                    type="number"
                    placeholder="400.5"
                    className="flex-1"
                    onChange={handleChange}
                  />
                  <Select
                    onValueChange={(v) => handleSelect(v, "unit")}
                    defaultValue={formData.unit}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ton">ton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PHOTO SECTION */}
              <div className="space-y-2">
                <Button
                  onClick={() => setIsCameraOpen(true)}
                  className="bg-primary"
                >
                  <Camera className="h-4 w-4 mr-2" /> Ambil Foto
                </Button>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="photoUpload"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhoto(file)
                    e.target.value = ""
                  }}
                />

                <label
                  htmlFor="photoUpload"
                  className="cursor-pointer px-4 py-2 bg-secondary rounded-md inline-block"
                >
                  Upload dari Galeri
                </label>

                {formData.photo && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span>{formData.photo.name}</span>
                    <Trash
                      className="h-4 w-4 cursor-pointer text-red-500"
                      onClick={() => setFormData((p) => ({ ...p, photo: null }))}
                    />
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  Batal
                </Button>
                <Button
                  disabled={loading}
                  onClick={submitHarvest}
                  className="bg-primary text-white"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Kirim"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TABLE */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Panen</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.batchNumber}</TableCell>
                    <TableCell>{r.quantity} {r.unit}</TableCell>
                    <TableCell>{r.harvestDate}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </FarmerLayout>
  )
}
