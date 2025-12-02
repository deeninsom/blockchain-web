"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { useNotification } from "@/lib/notification-context"
import { Camera, Trash, CheckCircle, Clock, Check, Loader2, ArrowRight } from "lucide-react"

// --- Import Komponen Tabel dari Shadcn/ui ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// ---------------------------------------------

import { CameraCapture } from "@/components/farmer/camera-capture"

interface HarvestRecord {
  id: string
  batchId: string
  location: string
  harvestDate: string
  quantity: string // String untuk tampilan UI
  unit: string
  photos: string[] // Sekarang berisi URL/Path
  ipfsHash?: string
  txHash?: string
  status: "pending" | "submitted" | "confirmed"
  createdAt: string
}

// Helper untuk menampilkan Status
const StatusBadge: React.FC<{ status: HarvestRecord['status'] }> = ({ status }) => {
  let icon = <Clock className="h-4 w-4 mr-1" />;
  let color = "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
  let text = "Pending";

  if (status === "submitted") {
    icon = <Loader2 className="h-4 w-4 mr-1 animate-spin" />;
    color = "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400";
    text = "Submitted";
  } else if (status === "confirmed") {
    icon = <Check className="h-4 w-4 mr-1" />;
    color = "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400";
    text = "Confirmed";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {text}
    </span>
  );
};

export default function RecordHarvestPage() {
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<HarvestRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // State Loading
  const [formData, setFormData] = useState({
    batchId: "",
    location: "",
    harvestDate: new Date().toISOString().substring(0, 16), // datetime-local format
    quantity: "",
    unit: "kg",
    photos: [] as File[], // Hanya satu file yang akan dikirim ke backend
  })

  const fetchRecords = async () => {
    setIsLoading(true); // Mulai loading untuk fetch
    try {
      // Ubah path API menjadi '/api/harvest/record' jika sebelumnya hanya '/api/v1/harvest/record'
      const response = await fetch('/api/v1/harvest/record');
      if (!response.ok) throw new Error('Gagal mengambil data');

      const result = await response.json();

      const formattedRecords: HarvestRecord[] = result.records.map((r: any) => ({
        id: r.id,
        batchId: r.batchId,
        location: r.location,
        // Pastikan format tanggal sesuai untuk tampilan
        harvestDate: new Date(r.harvestDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        quantity: parseFloat(r.quantity).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), // Format kuantitas
        unit: r.unit,
        photos: [r.photoUrl], // Menggunakan photoUrl dari backend
        status: "confirmed", // Asumsi data dari DB sudah confirmed
        createdAt: new Date(r.createdAt).toLocaleDateString('id-ID'),
        ipfsHash: r.ipfsHash || undefined,
        txHash: r.txHash || undefined,
      }))

      setRecords(formattedRecords);
    } catch (error) {
      console.error(error);
      addNotification("Error", "Gagal memuat data panen dari server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Panggil saat komponen pertama kali dimuat
  useEffect(() => {
    fetchRecords();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Menangani foto yang diambil dari CameraCapture atau file input
  const handlePhotoCaptured = (file: File) => {
    setFormData((prev) => ({
      ...prev,
      photos: [file], // Hanya simpan 1 file
    }));
    setIsCameraOpen(false);
    addNotification("Berhasil", `Foto (${file.name}) berhasil diambil`, "success");
  };

  // Menghapus foto dari daftar
  const removePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photos: [],
    }));
  };

  const handleSubmitHarvest = async () => {
    // 1. Validasi
    if (!formData.batchId || !formData.location || !formData.harvestDate || !formData.quantity) {
      addNotification("Error", "Semua field wajib diisi", "error")
      return
    }
    if (formData.photos.length === 0) {
      addNotification("Error", "Mohon tambahkan satu foto panen", "error")
      return
    }

    const primaryPhoto = formData.photos[0];

    // 2. Persiapan Data (FormData untuk Multipart Request)
    const dataToSend = new FormData();
    dataToSend.append('batchId', formData.batchId);
    dataToSend.append('location', formData.location);
    // Konversi ke ISOString agar Backend (Prisma) bisa mem-parse DateTime
    const formattedDate = new Date(formData.harvestDate).toISOString();
    dataToSend.append('harvestDate', formattedDate);
    dataToSend.append('quantity', formData.quantity);
    dataToSend.append('unit', formData.unit);
    // Mengirim File dengan key 'photos'
    dataToSend.append('photos', primaryPhoto, primaryPhoto.name);

    setIsLoading(true);

    try {
      // 3. Panggilan API ke Backend Next.js
      const response = await fetch('/api/v1/harvest/record', { // Ganti ke path yang benar
        method: 'POST',
        body: dataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        addNotification("Error Server", result.message || "Gagal mencatat data panen", "error");
        return;
      }

      // 4. Update UI setelah Sukses
      const recordFromBackend = result.record;

      const newRecord: HarvestRecord = {
        id: recordFromBackend.id,
        batchId: recordFromBackend.batchId,
        location: recordFromBackend.location,
        harvestDate: new Date(recordFromBackend.harvestDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        quantity: parseFloat(formData.quantity).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        unit: formData.unit,
        photos: [recordFromBackend.photoUrl],
        status: "submitted", // Set status awal submitted
        createdAt: new Date(recordFromBackend.createdAt).toLocaleDateString("id-ID"),
      }

      setRecords((prev) => [newRecord, ...prev])
      // Reset form
      setFormData({
        batchId: "",
        location: "",
        harvestDate: new Date().toISOString().substring(0, 16),
        quantity: "",
        unit: "kg",
        photos: [],
      })
      setIsDialogOpen(false)

      addNotification("Berhasil", result.message || "Data harvest berhasil dicatat di server.", "success")

      // SIMULASI: Konfirmasi Blockchain
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
      console.error("API Fetch Error:", error);
      addNotification("Error Jaringan", "Gagal terhubung ke server API", "error");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteRecord = (id: string) => {
    // TODO: Tambahkan logika penghapusan di backend
    setRecords((prev) => prev.filter((r) => r.id !== id))
    addNotification("Berhasil", "Data harvest dihapus (lokal saja, belum di server)", "info")
  }

  return (
    <FarmerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Record Harvest</h1>
            <p className="text-muted-foreground mt-2">
              Catat data panen Anda untuk sistem ketertelusuran.
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
                Masukkan detail panen.
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
                    placeholder="ID Kelompok Panen"
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Lokasi</label>
                  <Input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Blok A, Lahan 3"
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
                      step="0.01"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="400.5"
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-foreground mb-2">Unit</label>
                    <Select
                      name="unit"
                      value={formData.unit}
                      onValueChange={(val) => handleSelectChange(val, 'unit')}
                    >
                      <SelectTrigger className="bg-input border-border text-foreground">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ton">ton</SelectItem>
                        <SelectItem value="unit">unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Foto Panen (Hanya 1 Foto)</label>

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
                        onClick={() => removePhoto()}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                        title="Hapus foto ini"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-primary text-white"
                    title="Ambil foto panen langsung menggunakan kamera perangkat"
                  >
                    <Camera className="h-4 w-4 mr-2" /> Ambil Foto Sekarang
                  </Button>

                  {/* Input File yang disembunyikan */}
                  <label className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer">
                    <input
                      type="file"
                      multiple={false} // Hanya izinkan 1 file
                      accept="image/*"
                      onChange={(e) => {
                        const file = Array.from(e.target.files || [])[0];
                        if (file) handlePhotoCaptured(file);
                        e.target.value = ''; // Reset input agar file yang sama bisa diupload ulang
                      }}
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
                  disabled={formData.photos.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Mengirim...
                    </span>
                  ) : 'Catat & Kirim ke Server'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isCameraOpen && (
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onClose={() => setIsCameraOpen(false)}
          />
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Daftar Catatan Panen</h2>

          {isLoading && records.length === 0 ? (
            <p className="text-center text-muted-foreground">Memuat data...</p>
          ) : records.length === 0 ? (
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
            <div className="rounded-md border bg-card/50 backdrop-blur overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Tanggal Panen</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-right">Kuantitas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.batchId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.harvestDate}</TableCell>
                      <TableCell>{record.location}</TableCell>
                      <TableCell className="text-right font-bold text-lg whitespace-nowrap">
                        {record.quantity} {record.unit}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Lihat detail dan hash blockchain"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </FarmerLayout>
  )
}