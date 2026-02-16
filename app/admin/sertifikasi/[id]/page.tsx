'use client'

import React, { useEffect, useState, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useNotification } from "@/lib/notification-context"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useParams, useRouter } from "next/navigation"

const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/"
const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_URL + "public-tx/"

interface Network {
  network: string
  txHash: string
  blockNumber: string
  blockTimestamp: string
}

interface HarvestResponse {
  batchId: string
  status: string
  harvestData: {
    id: string
    batchId: string
    location: string
    productName: string
    harvestDate: string
    quantity: string
    unit: string
    photoIpfsHash: string
    networks: Network[]
    ipfs: {
      timestamp: string
    }
  }
}

export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string
  const { addNotification } = useNotification()

  const [data, setData] = useState<HarvestResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // FORM STATE
  const [certificateName, setCertificateName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/harvest-log/${recordId}`)
      if (!res.ok) throw new Error("Gagal memuat data")
      const result = await res.json()
      setData(result)
    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setLoading(false)
    }
  }, [recordId, addNotification])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleVerification = async () => {
    // 1. Validasi awal
    if (!certificateName || !expiryDate || !file || !categoryName) {
      addNotification("Validasi", "Semua field wajib diisi", "warning");
      return;
    }

    // DEBUG: Pastikan file tidak 0 bytes sebelum dikirim
    console.log("Mengirim file:", file.name, "Ukuran:", file.size, "bytes");

    if (file.size === 0) {
      addNotification("Error", "File yang Anda pilih kosong (0 bytes)", "error");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("certificateName", certificateName);
      formData.append("expiryDate", expiryDate);
      formData.append("notes", notes);
      formData.append("categoryName", categoryName);
      formData.append("certificateFile", file); // Key ini harus cocok dengan req.formData().get('certificateFile') di API

      const res = await fetch(
        `/api/v1/harvest/record/sertified/${data?.harvestData.id}`,
        {
          method: "POST",
          // JANGAN menambahkan Header Content-Type di sini
          body: formData,
        }
      );

      // Jika server kirim 500, kemungkinan besar middleware memutus koneksi
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server Error Response:", errorText);
        throw new Error(`Server Error: ${res.status}`);
      }

      const result = await res.json();
      addNotification("Sukses", "Batch berhasil diverifikasi", "success");

      // Reset state...
      setFile(null);
      fetchDetail();
    } catch (err: any) {
      addNotification("Error", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Memuat detail...
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p>Data tidak ditemukan</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const { harvestData } = data

  return (
    <AdminLayout>
      <Card className="space-y-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {harvestData.productName}
            <span className="text-green-600 flex items-center text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              {data.status}
            </span>
          </CardTitle>
          <CardDescription>
            Batch ID: {data.batchId}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* DATA PANEN */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">
              📦 Informasi Panen
            </h3>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <p><strong>Lokasi:</strong> {harvestData.location}</p>
              <p><strong>Tanggal Panen:</strong> {harvestData.harvestDate}</p>
              <p><strong>Jumlah:</strong> {harvestData.quantity} {harvestData.unit}</p>
              <p>
                <strong>Timestamp IPFS:</strong>{" "}
                {new Date(harvestData.ipfs.timestamp).toLocaleString("id-ID")}
              </p>
            </div>

            <a
              href={`${IPFS_GATEWAY}${harvestData.photoIpfsHash}`}
              target="_blank"
              className="inline-block mt-3 underline text-blue-600"
            >
              🔗 Lihat Foto Panen (IPFS)
            </a>
          </div>

          {/* BLOCKCHAIN NETWORKS */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">
              ⛓️ Transaksi Blockchain
            </h3>

            {harvestData.networks?.map((net, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 bg-muted/40 text-sm space-y-1"
              >
                <p><strong>Network:</strong> {net.network}</p>
                <p>
                  <strong>Tx Hash:</strong>{" "}
                  <a
                    href={`${EXPLORER_BASE}${net.txHash}`}
                    target="_blank"
                    className="underline break-all"
                  >
                    {net.txHash}
                  </a>
                </p>
                <p><strong>Block:</strong> {net.blockNumber}</p>
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(net.blockTimestamp).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>

          {/* FINAL VERIFICATION FORM */}
          {data.status === "VERIFIED" && (
            <div className="space-y-6 border-t pt-8">

              <div>
                <h3 className="font-semibold text-lg">
                  🧾 Final Verification (Admin)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload sertifikat untuk mengkonfirmasi batch ke blockchain.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">

                <div className="space-y-2">
                  <Label>Nama Sertifikat *</Label>
                  <Input
                    placeholder="Contoh: Sertifikat Organik Nasional"
                    value={certificateName}
                    onChange={(e) => setCertificateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Kadaluarsa *</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={categoryName}
                    onValueChange={(value) => setCategoryName(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buah-buahan">
                        Buah-buahan
                      </SelectItem>
                      <SelectItem value="Sayuran">
                        Sayuran
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Upload Sertifikat *</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setFile(e.target.files ? e.target.files[0] : null)
                    }
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      File dipilih: {file.name}
                    </p>
                  )}
                </div>

              </div>

              <div className="space-y-2">
                <Label>Catatan Tambahan</Label>
                <Textarea
                  placeholder="Tambahkan catatan jika diperlukan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleVerification}
                  disabled={submitting}
                  className="w-full md:w-auto"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {submitting
                    ? "Memproses Verifikasi..."
                    : "Kirim"}
                </Button>
              </div>

            </div>
          )}

        </CardContent>
      </Card>
    </AdminLayout>
  )
}
