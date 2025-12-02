"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { useNotification } from "@/lib/notification-context"

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData((prev) => ({ ...prev, photos: files }))
  }

  const handleSubmitHarvest = async () => {
    if (!formData.batchId || !formData.location || !formData.harvestDate || !formData.quantity) {
      addNotification("Error", "Semua field wajib diisi", "error")
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
        photos: formData.photos.map((f) => f.name),
        status: "pending",
        createdAt: new Date().toLocaleString("id-ID"),
      }

      setRecords((prev) => [newRecord, ...prev])
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
                <label className="block text-sm font-medium text-foreground mb-2">Upload Foto</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {formData.photos.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">{formData.photos.length} foto dipilih</p>
                )}
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
                >
                  Catat & Kirim ke Blockchain
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records List */}
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
