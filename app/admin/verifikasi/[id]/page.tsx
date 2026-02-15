'use client'

import React, { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useNotification } from "@/lib/notification-context"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2, ArrowLeft,
  CheckCircle,
  Trash,
  Clock,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Tabs } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/* -------------------------------------------------------------------------- */
/* TYPES & CONSTANTS                                                          */
/* -------------------------------------------------------------------------- */
type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";

interface HarvestRecord {
  id: string
  batchId: string
  productName: string
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

interface VerificationFormData {
  certificateName: string;
  expiryDate: Date | undefined;
  file: File | null;
  notes: string;
  categoryName: string;
}

// Hasil trace API
interface TraceVerificationResult {
  isVerified: boolean;
  batchId: string;
  eventTimestamp: string;
  txHash: string | null;
  certName: string | null;
  expiryDate: string | null;
  notes: string | null;
  certificateFileHash: string | null;
  verifierAddress: string | null;
  status: string;
}

interface VerificationFormProps {
  recordId: string;
  currentStatus: RecordStatus;
  onSuccess: () => void;
}

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
const EXPLORER_BASE_URL = `${process.env.NEXT_PUBLIC_URL}public-tx/`;

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                               */
/* -------------------------------------------------------------------------- */
const StatusBadge: React.FC<{ status: RecordStatus | string }> = ({ status }) => {
  const config = {
    PENDING: { icon: <Clock className="h-4 w-4 mr-1" />, text: "Menunggu Review", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300" },
    REJECTED: { icon: <Trash className="h-4 w-4 mr-1" />, text: "Ditolak Admin", color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400" },
    VERIFIED: { icon: <CheckCircle className="h-4 w-4 mr-1 " />, text: "Terverifikasi", color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
    CONFIRMED: { icon: <CheckCircle className="h-4 w-4 mr-1" />, text: "Confirmed", color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400" },
    NOT_FOUND: { icon: <Clock className="h-4 w-4 mr-1" />, text: "Belum Diverifikasi", color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400" },
    UNKNOWN: { icon: <Loader2 className="h-4 w-4 mr-1" />, text: "Status Tidak Dikenal", color: "text-red-500 bg-red-50 dark:bg-red-900/50 dark:text-red-300" }
  };
  const currentConfig = config[status as keyof typeof config] || config.UNKNOWN;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>{currentConfig.icon}{currentConfig.text}</span>
};

/* -------------------------------------------------------------------------- */
/* VERIFICATION FORM                                                          */
/* -------------------------------------------------------------------------- */
const VerificationForm: React.FC<VerificationFormProps> = ({ recordId, currentStatus, onSuccess }) => {
  const router = useRouter();
  const { addNotification } = useNotification();
  console.log(recordId)

  const [formData, setFormData] = useState<VerificationFormData>({
    certificateName: '',
    expiryDate: undefined,
    file: null,
    categoryName: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationData, setVerificationData] = useState<TraceVerificationResult | null>(null);

  const isPending = currentStatus === 'PENDING';

  useEffect(() => {
    if (!isPending) {
      const fetchTrace = async () => {
        try {
          const res = await fetch(`/api/v1/harvest/record/trace/${recordId}`);
          if (!res.ok) throw new Error('Gagal memuat data verifikasi');
          const data = await res.json();
          if (data.success) setVerificationData(data.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchTrace();
    }
  }, [recordId, isPending]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFormData(prev => ({ ...prev, file: e.target.files![0] }));
    else setFormData(prev => ({ ...prev, file: null }));
  };

  const handleReject = async () => {
    if (!isPending) return;
    if (!formData.notes) { addNotification("Validasi", "Catatan Admin wajib diisi untuk penolakan.", "warning"); return; }
    if (!window.confirm("Anda yakin ingin MENOLAK catatan panen ini?")) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/harvest/record/reject/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: formData.notes }),
      });
      if (!res.ok) throw new Error('Gagal menolak catatan');
      addNotification("Sukses", "Catatan berhasil ditolak.", "info");
      onSuccess();
    } catch (err: any) {
      addNotification("Error", err.message || "Terjadi kesalahan saat menolak.", "error");
    } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPending) return;

    if (!formData.certificateName || !formData.expiryDate || !formData.file) {
      addNotification("Validasi", "Semua field Verifikasi harus diisi.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('certificateName', formData.certificateName);
      payload.append('expiryDate', formData.expiryDate!.toISOString());
      payload.append('notes', formData.notes || '');
      payload.append('categoryName', formData.categoryName || '');
      payload.append('certificateFile', formData.file);

      const res = await fetch(`/api/v1/harvest/record/sertified/${recordId}`, {
        method: 'POST',
        body: payload,
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Gagal melakukan verifikasi.');
      }

      const successData = await res.json();
      addNotification("Verifikasi Sukses", `Status diperbarui: ${successData.batchStatus}`, "success");
      onSuccess();
    } catch (err: any) {
      addNotification("Error", err.message || "Terjadi kesalahan saat verifikasi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aksi Verifikasi & Persetujuan</CardTitle>
          <CardDescription>Status saat ini: <StatusBadge status={currentStatus} /></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="certificateName">Nama Sertifikat</Label>
                <Input id="certificateName" name="certificateName" value={formData.certificateName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Kategori Produk</Label>
                <Select value={formData.categoryName} onValueChange={(val) => setFormData(prev => ({ ...prev, categoryName: val }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buah-buahan">Buah-buahan</SelectItem>
                    <SelectItem value="sayuran">Sayuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Tanggal Kadaluarsa Sertifikat</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full text-left">{formData.expiryDate ? format(formData.expiryDate, "PPP") : "Pilih Tanggal"}</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={formData.expiryDate} onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Upload File Sertifikat</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
                {formData.file && <p className="text-xs text-green-600">File dipilih: {formData.file.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan Admin</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="destructive" onClick={handleReject} disabled={isSubmitting}><Trash className="mr-2 h-4 w-4" /> Tolak Catatan</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Verifikasi & Setujui"}</Button>
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Detail jika sudah VERIFIED/CONFIRMED
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detail Verifikasi</CardTitle>
        <CardDescription>Status saat ini: <StatusBadge status={currentStatus} /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verificationData ? (
          <>
            <p><strong>Nama Sertifikat:</strong> {verificationData.certName || "-"}</p>
            <p><strong>Kategori:</strong> {formData.categoryName || "-"}</p>
            <p><strong>Tanggal Kadaluarsa:</strong> {verificationData.expiryDate ? new Date(verificationData.expiryDate).toLocaleDateString("id-ID") : "-"}</p>
            <p><strong>Catatan:</strong> {verificationData.notes || "-"}</p>
            <p><strong>File Sertifikat:</strong> {verificationData.certificateFileHash ? <a href={`${IPFS_GATEWAY_URL}${verificationData.certificateFileHash}`} target="_blank" className="underline text-blue-600">Lihat File</a> : "-"}</p>
            <p><strong>Transaksi Blockchain:</strong> {verificationData.txHash ? <a href={`${EXPLORER_BASE_URL}${verificationData.txHash}`} target="_blank" className="underline text-blue-600">{verificationData.txHash.substring(0, 10)}...</a> : "-"}</p>
          </>
        ) : <p className="text-muted-foreground">Memuat detail verifikasi...</p>}
      </CardContent>
    </Card>
  )
};

/* -------------------------------------------------------------------------- */
/* HALAMAN DETAIL HARVEST                                                     */
/* -------------------------------------------------------------------------- */
export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string
  const { addNotification } = useNotification()

  const [record, setRecord] = useState<HarvestRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingIpfs, setLoadingIpfs] = useState(false)
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null)

  const fetchIpfsMetadata = useCallback(async (ipfsHash: string) => {
    setLoadingIpfs(true); setIpfsMetadata(null)
    try {
      const res = await fetch(`${IPFS_GATEWAY_URL}${ipfsHash}`);
      if (!res.ok) throw new Error(`Gagal mengambil data dari IPFS Gateway: ${res.status}`);
      const metadata = await res.json(); setIpfsMetadata(metadata)
    } catch (err) { console.error("Fetch IPFS Error:", err) }
    finally { setLoadingIpfs(false) }
  }, [])

  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/harvest/record/${id}`)
      if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || "Gagal memuat data detail panen") }
      const r = await res.json()
      const formatted: HarvestRecord = {
        id: r.id,
        batchId: r.batchId,
        productName: r.productName || "Produk N/A",
        location: r.location,
        harvestDate: new Date(r.harvestDate).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        quantity: parseFloat(r.quantity || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        unit: r.unit,
        photoIpfsHash: r.photoIpfsHash,
        txHash: r.txHash,
        ipfsHash: r.ipfsHash,
        status: r.status,
        createdAt: new Date(r.createdAt).toLocaleDateString("id-ID")
      }
      setRecord(formatted)
      if (r.ipfsHash) fetchIpfsMetadata(r.ipfsHash)
    } catch (err: any) {
      console.error("Fetch Detail Error:", err)
      addNotification("Error", err.message || "Gagal memuat data detail panen", "error")
    } finally { setLoading(false) }
  }, [addNotification, fetchIpfsMetadata])

  const reloadRecord = () => fetchRecordDetail(recordId)

  useEffect(() => { fetchRecordDetail(recordId) }, [fetchRecordDetail, recordId])

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat Detail...
      </div>
    </AdminLayout>
  )

  if (!record) return (
    <AdminLayout>
      <div className="text-center py-20">
        <p className="text-lg font-medium">Catatan panen tidak ditemukan.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Riwayat</Button>
      </div>
    </AdminLayout>
  )
  console.log(record)
  return (
    <AdminLayout>
      <Tabs defaultValue="detail" className="space-y-6">

        {
          record.status === 'PENDING' && (
            <>
              <VerificationForm recordId={record.id} currentStatus={record.status} onSuccess={reloadRecord} />
            </>
          )
        }
        {
          record.status === 'VERIFIED' && (
            <>
              HALO
            </>
          )
        }
      </Tabs>
    </AdminLayout>
  )
}



