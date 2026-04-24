'use client'

import React, { useState, useEffect, useCallback } from "react"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { useNotification } from "@/lib/notification-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, CheckCircle, Clock, Trash, FileBox } from "lucide-react"

// Sesuaikan URL Gateway IPFS jika perlu
const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/"

type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";

interface CertificationApp {
  id: string;
  batchId: string;
  productName: string;
  farmerName?: string;
  harvestDate?: string;
  quantity?: string;
  unit?: string;
  documentHash: string | null;
  status: RecordStatus;
  createdAt: string;
}

const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const config = {
    PENDING: { icon: <Clock className="h-4 w-4 mr-1" />, text: "Diproses", color: "text-gray-500 bg-gray-100" },
    REJECTED: { icon: <Trash className="h-4 w-4 mr-1" />, text: "Ditolak", color: "text-red-700 bg-red-100" },
    VERIFIED: { icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />, text: "Diverifikasi", color: "text-indigo-700 bg-indigo-100" },
    CONFIRMED: { icon: <CheckCircle className="h-4 w-4 mr-1" />, text: "Tersertifikasi", color: "text-green-700 bg-green-100" },
  };

  const st = config[status] || config.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
      {st.icon}
      {st.text}
    </span>
  );
}

export default function CertificationPage() {
  const { addNotification } = useNotification()
  const [records, setRecords] = useState<CertificationApp[]>([])
  const [availableHarvests, setAvailableHarvests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    batchId: "",
    document: null as File | null,
  })

  // FETCH RECORDS
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/certification/apply")
      if (!res.ok) throw new Error("Gagal mengambil data pengajuan")
      
      const json = await res.json()
      let apps: any[] = [];
      if (json.success) {
        apps = json.records.map((r: any) => ({
          ...r,
          // map properties from backend response
          createdAt: new Date(r.createdAt).toLocaleDateString("id-ID")
        }))
        setRecords(apps)
      } else {
        throw new Error(json.message)
      }

      // Fetch harvests to select from
      const hvRes = await fetch("/api/v1/harvest/record")
      const hvJson = await hvRes.json()
      if (hvJson.success) {
        // filter out those that already have an application
        const avail = hvJson.records.filter((h: any) => !apps.some((a: any) => a.batchId === h.batchId))
        setAvailableHarvests(avail);
      }

    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const submitApplication = async () => {
    if (!formData.batchId || !formData.document) {
      addNotification("Error", "Silakan pilih data panen dan unggah dokumen.", "error")
      return
    }

    try {
      setSubmitting(true)
      const fd = new FormData()
      fd.append("batchId", formData.batchId)
      fd.append("document", formData.document)

      const res = await fetch("/api/certification/apply", {
        method: "POST",
        body: fd,
      })
      const result = await res.json()
      
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal mengirim pengajuan.")
      }

      addNotification("Success", "Pengajuan sertifikasi berhasil dikirim.", "success")
      setFormData({ batchId: "", document: null })
      setFormOpen(false)
      fetchRecords()
    } catch (err: any) {
      addNotification("Error", err.message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FarmerLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Pengajuan Sertifikasi</h1>
            <p className="text-muted-foreground mt-2">Daftarkan data panen Anda untuk mendapatkan sertifikat resmi.</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="bg-primary">Baru</Button>
        </div>

        {formOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Form Pengajuan Sertifikasi</CardTitle>
              <CardDescription>Pilih data panen sebelumnya dan unggah dokumen legalitas terkait.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Data Panen Sebelumnya</label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.batchId}
                    onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">-- Pilih Data Panen --</option>
                    {availableHarvests.map((h: any) => (
                      <option key={h.batchId} value={h.batchId}>
                        {h.productName} ({h.quantity} {h.unit}) - {new Date(h.harvestDate).toLocaleDateString("id-ID")} - {h.batchId}
                      </option>
                    ))}
                  </select>
                  {availableHarvests.length === 0 && (
                    <p className="text-xs text-red-500">Tidak ada data panen yang tersedia untuk diajukan sertifikasi.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Unggah Dokumen Legalitas (PDF/JPG)</label>
                <Input
                  type="file"
                  onChange={e => setFormData({ ...formData, document: e.target.files ? e.target.files[0] : null })}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Batal</Button>
                <Button onClick={submitApplication} disabled={submitting || availableHarvests.length === 0 || !formData.batchId} className="bg-primary">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kirim Pengajuan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pengajuan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && records.length === 0 ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : records.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Belum ada pengajuan sertifikasi.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Kuantitas</TableHead>
                      <TableHead>Tgl Panen</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.batchId}</TableCell>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell>{r.location}</TableCell>
                        <TableCell>{r.quantity ? `${r.quantity} ${r.unit}` : "-"}</TableCell>
                        <TableCell>{r.harvestDate ? new Date(r.harvestDate).toLocaleDateString("id-ID") : r.createdAt}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmerLayout>
  )
}
