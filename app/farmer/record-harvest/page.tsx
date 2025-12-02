"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { useNotification } from "@/lib/notification-context"
import { Camera, Trash, CheckCircle } from "lucide-react"
import { CameraCapture } from "@/components/farmer/camera-capture" // Asumsi disimpan di './camera-capture.tsx'


interface HarvestRecord {
  id: string
  batchId: string
  location: string
  harvestDate: string
  quantity: string
  unit: string
  photos: string[]
  ipfsHash?: string
  txHash?: string
  status: "pending" | "submitted" | "confirmed"
  createdAt: string
}

export default function RecordHarvestPage() {
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<HarvestRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false) // State baru untuk mengontrol modal kamera
  const [formData, setFormData] = useState({
    batchId: "",
    location: "",
    harvestDate: "",
    quantity: "",
    unit: "kg",
    photos: [] as File[],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Fungsi untuk menangani foto yang diupload dari file input (Fungsionalitas lama tetap ada)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({ ...prev, photos: [...prev.photos, ...files] }))
    addNotification("Berhasil", `${files.length} foto berhasil ditambahkan`, "success");
  }

  // Fungsi baru: Menangani foto yang diambil dari CameraCapture
  const handlePhotoCaptured = (file: File) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, file],
    }));
    setIsCameraOpen(false); // Tutup kamera setelah foto diambil
    addNotification("Berhasil", `Foto (${file.name}) berhasil diambil`, "success");
  };

  // Fungsi baru: Menghapus foto dari daftar
  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitHarvest = async () => {
    if (!formData.batchId || !formData.location || !formData.harvestDate || !formData.quantity) {
      addNotification("Error", "Semua field wajib diisi", "error")
      return
    }
    if (formData.photos.length === 0) {
      addNotification("Error", "Mohon tambahkan setidaknya satu foto panen", "error")
      return
    }

    try {
      const newRecord: HarvestRecord = {
        id: Date.now().toString(),
        batchId: formData.batchId,
        location: formData.location,
        harvestDate: formData.harvestDate,
        quantity: formData.quantity,
        unit: formData.unit,
        photos: formData.photos.map((f) => f.name), // Simpan hanya nama file untuk simulasi
        status: "pending",
        createdAt: new Date().toLocaleString("id-ID"),
      }

      setRecords((prev) => [newRecord, ...prev])
      // Reset form
      setFormData({
        batchId: "",
        location: "",
        harvestDate: "",
        quantity: "",
        unit: "kg",
        photos: [],
      })
      setIsDialogOpen(false)

      addNotification("Berhasil", "Data harvest berhasil dicatat dan menunggu konfirmasi blockchain", "success")

      // Simulate blockchain submission
      setTimeout(() => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === newRecord.id
              ? {
                ...r,
                status: "confirmed",
                txHash: `0x${Math.random().toString(16).slice(2)}`,
                ipfsHash: `QmHash${Math.random().toString(36).slice(2, 9)}`,
              }
              : r,
          ),
        )
        addNotification("Blockchain", "Data harvest dikonfirmasi di blockchain", "success")
      }, 3000)
    } catch (error) {
      addNotification("Error", "Gagal mencatat data harvest", "error")
    }
  }

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
    addNotification("Berhasil", "Data harvest dihapus", "info")
  }

  return (
    <FarmerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Record Harvest</h1>
            <p className="text-muted-foreground mt-2">
              Catat data panen Anda dengan informasi lengkap untuk blockchain
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            + Catat Panen Baru
          </Button>
        </div>

        {/* Form Dialog */}
        {isDialogOpen && (
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-foreground">Catatan Panen Baru</CardTitle>
              <CardDescription className="text-muted-foreground">
                Masukkan detail panen yang akan disimpan ke blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Batch ID</label>
                  <Input
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    placeholder="BATCH-20240101-001"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Lokasi</label>
                  <Input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Desa Sumbermulyo, Jawa Timur"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tanggal Panen</label>
                  <Input
                    name="harvestDate"
                    type="datetime-local"
                    value={formData.harvestDate}
                    onChange={handleInputChange}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">Kuantitas</label>
                    <Input
                      name="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="100"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-foreground mb-2">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                    >
                      <option>kg</option>
                      <option>ton</option>
                      <option>liter</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Upload/Ambil Foto Panen</label>

                {/* Tampilan Foto yang Sudah Ditambahkan */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.photos.map((file, index) => (
                    <div
                      key={index}
                      className="relative border border-primary/50 bg-primary/10 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-primary"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}</span>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                        title="Hapus foto ini"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {/* Tombol Ambil Foto dari Kamera */}
                  <Button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-primary text-white"
                    title="Ambil foto panen langsung menggunakan kamera perangkat"
                  >
                    <Camera className="h-4 w-4 mr-2" /> Ambil Foto Sekarang
                  </Button>

                  {/* Input File (Opsional, untuk upload dari galeri) */}
                  <label className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                    Upload dari Galeri
                  </label>
                </div>

              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSubmitHarvest}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={formData.photos.length === 0}
                >
                  Catat & Kirim ke Blockchain
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal Kamera - Ditempatkan di luar Card agar berfungsi sebagai modal penuh */}
        {isCameraOpen && (
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onClose={() => setIsCameraOpen(false)}
          />
        )}


        {/* Records List (Tidak diubah) */}
        <div className="space-y-3">
          {records.length === 0 ? (
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Belum ada data panen yang dicatat</p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Catat Panen Pertama
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="border-border bg-card/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Batch ID</p>
                      <p className="font-semibold text-foreground">{record.batchId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status Blockchain</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`h-2 w-2 rounded-full ${record.status === "confirmed"
                            ? "bg-green-500"
                            : record.status === "submitted"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                            }`}
                        />
                        <p className="text-sm font-medium text-foreground capitalize">{record.status}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lokasi</p>
                      <p className="font-semibold text-foreground">{record.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kuantitas</p>
                      <p className="font-semibold text-foreground">
                        {record.quantity} {record.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Panen</p>
                      <p className="font-semibold text-foreground">{record.harvestDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Foto</p>
                      <p className="font-semibold text-foreground">{record.photos.length} file</p>
                    </div>
                  </div>

                  {record.ipfsHash && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-1">
                      <p className="text-xs text-muted-foreground">IPFS Hash:</p>
                      <p className="text-xs font-mono text-foreground break-all">{record.ipfsHash}</p>
                      <p className="text-xs text-muted-foreground mt-2">TX Hash:</p>
                      <p className="text-xs font-mono text-foreground break-all">{record.txHash}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground hover:bg-muted bg-transparent"
                    >
                      Lihat Detail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </FarmerLayout>
  )
}