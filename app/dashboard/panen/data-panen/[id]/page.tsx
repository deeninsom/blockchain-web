'use client'

import React, { useState, useEffect, useCallback } from "react"
// Asumsi: FarmerLayout digunakan juga untuk Admin
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
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
  ExternalLink
} from "lucide-react"

import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Komponen Form UI
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"


/* -------------------------------------------------------------------------- */
/* TYPES & CONSTANTS                           */
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
}

// 🟢 Tipe Data Hasil Trace (sesuai output GET /api/v1/harvest/record/trace/[batchId])
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
  status: string; // Status Batch
}

interface VerificationFormProps {
  recordId: string;
  currentStatus: RecordStatus;
  onSuccess: () => void;
}


const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
const EXPLORER_BASE_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://192.168.43.5:3000/explorer/tx/';


/* -------------------------------------------------------------------------- */
/* STATUS COMPONENT                            */
/* -------------------------------------------------------------------------- */
const StatusBadge: React.FC<{ status: RecordStatus | string }> = ({ status }) => {
  const statusKey = status as keyof typeof config;

  const config = {
    PENDING: {
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Menunggu Review",
      color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    REJECTED: {
      icon: <Trash className="h-4 w-4 mr-1" />,
      text: "Ditolak Admin",
      color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
    },
    VERIFIED: {
      icon: <CheckCircle className="h-4 w-4 mr-1 " />,
      text: "Terverifikasi (Off-chain)",
      color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    CONFIRMED: {
      icon: <CheckCircle className="h-4 w-4 mr-1" />,
      text: "Blockchain Confirmed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400",
    },
    NOT_FOUND: { // Digunakan untuk status batch dari trace API
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Belum Diverifikasi",
      color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400",
    },
    UNKNOWN: {
      icon: <Loader2 className="h-4 w-4 mr-1" />,
      text: "Status Tidak Dikenal",
      color: "text-red-500 bg-red-50 dark:bg-red-900/50 dark:text-red-300",
    }
  }

  const currentConfig = config[statusKey] || config.UNKNOWN;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>
      {currentConfig.icon}
      {currentConfig.text}
    </span>
  )
}


/* -------------------------------------------------------------------------- */
/* KOMPONEN FORM VERIFIKASI */
/* -------------------------------------------------------------------------- */

const VerificationForm: React.FC<VerificationFormProps> = ({ recordId, currentStatus, onSuccess }) => {
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState<VerificationFormData>({
    certificateName: '',
    expiryDate: undefined,
    file: null,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPending = currentStatus === 'PENDING';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files![0] }));
    } else {
      setFormData(prev => ({ ...prev, file: null }));
    }
  };

  // Handler untuk Aksi Tolak (REJECT)
  const handleReject = async () => {
    if (!isPending) {
      addNotification("Aksi Ditolak", "Catatan ini sudah tidak dalam status 'Menunggu Review'.", "warning");
      return;
    }

    if (!formData.notes) {
      addNotification("Validasi", "Catatan Admin wajib diisi untuk penolakan.", "warning");
      return;
    }

    if (!window.confirm("Anda yakin ingin MENOLAK catatan panen ini? Status akan diubah menjadi REJECTED.")) return;

    setIsSubmitting(true);
    try {
      const rejectPayload = {
        notes: formData.notes
      };

      // ASUMSI: Endpoint PATCH /reject
      const res = await fetch(`/api/v1/harvest/record/reject/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Gagal melakukan penolakan.');
      }

      addNotification("Sukses", "Catatan berhasil ditolak. Status diperbarui.", "info");
      onSuccess(); // Muat ulang data
    } catch (error: any) {
      console.error("Rejection Error:", error);
      addNotification("Error", error.message || "Terjadi kesalahan saat menolak.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handler untuk Aksi Verifikasi (POST ke backend yang terintegrasi Blockchain)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPending) {
      addNotification("Aksi Ditolak", "Catatan ini sudah tidak dalam status 'Menunggu Review'.", "warning");
      return;
    }

    // Validasi Sederhana
    if (!formData.certificateName || !formData.expiryDate || !formData.file) {
      addNotification("Validasi", "Semua field Verifikasi harus diisi.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('certificateName', formData.certificateName);
      // Kirim tanggal dalam format ISOString
      payload.append('expiryDate', formData.expiryDate.toISOString());
      payload.append('notes', formData.notes);
      payload.append('certificateFile', formData.file);

      // POST ke API Verifikasi: /api/v1/harvest/record/verify/[id]
      const res = await fetch(`/api/v1/harvest/record/verify/${recordId}`, {
        method: 'POST',
        body: payload,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Gagal melakukan verifikasi.');
      }

      const successData = await res.json();

      addNotification(
        "Verifikasi Sukses! 🎉",
        `Status diperbarui menjadi ${successData.batchStatus}. Transaksi Blockchain: ${successData.txHash.substring(0, 10)}...`,
        "success"
      );

      onSuccess(); // Panggil onSuccess untuk memuat ulang detail di komponen induk (refresh status)

    } catch (error: any) {
      console.error("Verification Submission Error:", error);
      addNotification("Error", error.message || "Terjadi kesalahan saat verifikasi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Card className={!isPending ? 'opacity-70' : ''}>
      <CardHeader>
        <CardTitle>Aksi Verifikasi & Persetujuan</CardTitle>
        <CardDescription>Lengkapi detail sertifikat yang dikeluarkan untuk memverifikasi catatan panen ini. Status saat ini: <StatusBadge status={currentStatus} /></CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          <fieldset disabled={isSubmitting || !isPending} className="space-y-4">
            <h4 className="font-semibold text-md border-b pb-1">Detail Verifikasi & Sertifikasi</h4>

            {/* Nama Sertifikat */}
            <div className="space-y-2">
              <Label htmlFor="certificateName">Nama Sertifikat (e.g., Organic Standard 2024)</Label>
              <Input
                id="certificateName"
                name="certificateName"
                value={formData.certificateName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Tanggal Kadaluarsa */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Tanggal Kadaluarsa Sertifikat</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? format(formData.expiryDate, "PPP") : <span>Pilih Tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Upload File Sertifikat */}
            <div className="space-y-2">
              <Label htmlFor="file">Upload File Sertifikat (.pdf atau .jpg)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required={!formData.file}
              />
              {formData.file && (
                <p className="text-xs text-green-600">File dipilih: {formData.file.name}</p>
              )}
            </div>

            {/* Catatan Admin (Opsional untuk setuju, Wajib untuk tolak) */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="notes">Catatan Admin (Wajib untuk Tolak, Opsional untuk Verifikasi)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Tambahkan catatan verifikasi atau alasan penolakan..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              {/* Tombol Tolak */}
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting || !isPending}
                onClick={handleReject}
              >
                <Trash className="h-4 w-4 mr-2" />
                Tolak Catatan
              </Button>

              {/* Tombol Verifikasi/Setuju */}
              <Button type="submit" disabled={isSubmitting || !isPending}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Verifikasi & Setujui
              </Button>
            </div>
          </fieldset>

          {/* Pesan Jika Sudah Diverifikasi */}
          {!isPending && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
              Catatan ini sudah ditinjau dan statusnya **{currentStatus}**. Aksi verifikasi tidak dapat diulang.
            </div>
          )}

        </form>
      </CardContent>
    </Card>
  );
};


/* -------------------------------------------------------------------------- */
/* HALAMAN DETAIL (Perubahan & Penambahan di sini)                            */
/* -------------------------------------------------------------------------- */

export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string
  const { addNotification } = useNotification()

  const [record, setRecord] = useState<HarvestRecord | null>(null)
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingIpfs, setLoadingIpfs] = useState(false)

  // 🟢 STATE BARU untuk data Verifikasi
  const [verificationTrace, setVerificationTrace] = useState<TraceVerificationResult | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);


  const fetchIpfsMetadata = useCallback(async (ipfsHash: string) => {
    setLoadingIpfs(true);
    setIpfsMetadata(null);
    try {
      const ipfsUrl = `${IPFS_GATEWAY_URL}${ipfsHash}`;
      const res = await fetch(ipfsUrl);

      if (!res.ok) {
        throw new Error(`Gagal mengambil data dari IPFS Gateway: ${res.status}`);
      }

      const metadata = await res.json();
      setIpfsMetadata(metadata);

    } catch (err: any) {
      console.error("Fetch IPFS Error:", err);
    } finally {
      setLoadingIpfs(false);
    }
  }, []);


  // 🟢 FUNGSI BARU: Mengambil data verifikasi dari backend trace API
  const fetchVerificationTrace = useCallback(async (batchId: string) => {
    setLoadingTrace(true);
    setVerificationTrace(null);
    try {
      // Memanggil endpoint GET /api/v1/harvest/record/trace/[batchId]
      const res = await fetch(`/api/v1/harvest/record/trace/${batchId}`);

      if (!res.ok) {
        throw new Error("Gagal memuat data verifikasi.");
      }

      const traceData = await res.json();
      if (traceData.success) {
        setVerificationTrace(traceData.data as TraceVerificationResult);
      } else {
        console.error("Trace failed:", traceData.message);
      }

    } catch (err: any) {
      console.error("Fetch Trace Error:", err);
    } finally {
      setLoadingTrace(false);
    }
  }, []);


  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/harvest/record/${id}`)

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal memuat data detail panen");
      }

      const r = await res.json()

      // Format data
      const formatted: HarvestRecord = {
        id: r.id,
        batchId: r.batchId,
        productName: r.productName || "Produk N/A",
        location: r.location,
        harvestDate: new Date(r.harvestDate).toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }),
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
      }

      setRecord(formatted)

      if (r.ipfsHash) {
        fetchIpfsMetadata(r.ipfsHash);
      }

      // 🟢 Panggil trace setelah detail record dimuat
      if (r.batchId) {
        fetchVerificationTrace(r.batchId);
      }

    } catch (err: any) {
      console.error("Fetch Detail Error:", err);
      addNotification("Error", err.message || "Gagal memuat data detail panen", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification, fetchIpfsMetadata, fetchVerificationTrace])


  // Fungsi untuk memicu pemuatan ulang data (dipanggil dari VerificationForm)
  const reloadRecord = () => {
    fetchRecordDetail(recordId);
  };


  useEffect(() => {
    fetchRecordDetail(recordId)
  }, [fetchRecordDetail, recordId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat Detail...
        </div>
      </DashboardLayout>
    )
  }

  if (!record) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-lg font-medium">Catatan panen tidak ditemukan.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Riwayat
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // Komponen utama
  return (
    <DashboardLayout>
      <Tabs defaultValue="detail" className="space-y-6">

        {/* TAB MENU */}
        <TabsList>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          {/* Ganti trigger ini sesuai role Admin Anda */}
          <TabsTrigger value="aksi">Verifikasi</TabsTrigger>
        </TabsList>

        {/* TAB DETAIL */}
        <TabsContent value="detail">
          <Card>
            <div className="space-y-6">

              {/* HEADER & BACK BUTTON */}
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => router.back()} className="bg-white">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Riwayat
                </Button>
              </div>

              {/* DETAIL CARD */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Detail Catatan Panen {record.productName}</CardTitle>
                    <CardDescription>Batch: **{record.batchId}** | ID Event: {record.id}</CardDescription>
                  </div>

                  {/* QR CODE */}
                  <div className="flex flex-col items-center gap-1 border p-2 rounded-md bg-white shadow-sm">
                    <img
                      src={`/api/v1/qr-code/${record.batchId}`}
                      alt={`QR Code Traceability untuk Batch ID ${record.batchId}`}
                      width={100}
                      height={100}
                      className="object-contain"
                    />
                    <span className="text-xs font-medium text-gray-500 mt-1">QR Trace</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-6">

                    {/* DETAIL HARVEST */}
                    <h3 className="font-semibold text-lg border-b pb-1">Detail Panen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                      <p className="font-medium">Batch Number:</p><p className="truncate">{record.batchId}</p>
                      <p className="font-medium">Lokasi:</p><p className="truncate">{record.location}</p>
                      <p className="font-medium">Kuantitas:</p><p className="truncate font-bold text-primary">{record.quantity} {record.unit}</p>
                      <p className="font-medium">Waktu Panen:</p><p className="truncate">{record.harvestDate}</p>
                      <p className="font-medium">Waktu Pencatatan:</p><p className="truncate">{record.createdAt}</p>
                    </div>

                    <hr className="my-4" />

                    {/* STATUS & BUKTI DIGITAL */}
                    <h3 className="font-semibold text-lg border-b pb-1 pt-2">Status & Bukti Digital</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                      <p className="font-medium">Status:</p><p><StatusBadge status={record.status} /></p>

                      {/* Transaction Hash */}
                      {record.txHash && (
                        <>
                          <p className="font-medium">Transaction Hash (On-Chain):</p>
                          <a
                            href={`${EXPLORER_BASE_URL}${record.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 truncate font-mono text-xs"
                          >
                            {record.txHash.substring(0, 10)}...<ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>

                    <hr className="my-4" />

                    {/* DETAIL VERIFIKASI SERTIFIKAT (TAMPILAN BARU) */}
                    <h3 className="font-semibold text-lg border-b pb-1 pt-2">
                      📜 Bukti Verifikasi Admin & Sertifikat
                    </h3>

                    {loadingTrace ? (
                      <div className="flex items-center text-sm text-gray-500 pt-2">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat data verifikasi...
                      </div>
                    ) : verificationTrace?.isVerified ? (
                      <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/10">
                        <p className="text-sm font-bold text-green-700 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" /> VERIFIKASI RESMI DITEMUKAN (Status Batch: {verificationTrace.status})
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                          {/* Nama Sertifikat */}
                          <p className="font-medium">Nama Sertifikat:</p>
                          <p className="font-bold text-green-700">{verificationTrace.certName || 'N/A'}</p>

                          {/* Tanggal Kadaluarsa */}
                          <p className="font-medium">Kadaluarsa:</p>
                          <p>{verificationTrace.expiryDate ? format(new Date(verificationTrace.expiryDate), "PPP") : 'N/A'}</p>

                          {/* Verifikator */}
                          <p className="font-medium">Verifikator (Wallet):</p>
                          <p className="truncate font-mono text-xs">{verificationTrace.verifierAddress || 'N/A'}</p>

                          {/* Hash Transaksi Verifikasi */}
                          <p className="font-medium">Tx Hash Verifikasi (Blockchain):</p>
                          <a
                            href={`${EXPLORER_BASE_URL}${verificationTrace.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 truncate font-mono text-xs"
                          >
                            {verificationTrace.txHash?.substring(0, 10)}...<ExternalLink className="h-3 w-3" />
                          </a>

                          {/* Tautan Sertifikat File */}
                          <p className="font-medium">File Sertifikat (IPFS):</p>
                          <a
                            href={`${IPFS_GATEWAY_URL}${verificationTrace.certificateFileHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 truncate"
                          >
                            Lihat Dokumen <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {verificationTrace.notes && (
                          <div className="mt-4 border-t pt-2">
                            <p className="font-medium text-sm">Catatan Admin:</p>
                            <p className="text-sm italic text-gray-600">{verificationTrace.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-sm text-yellow-700">
                        <p className="font-medium">Catatan verifikasi (Sertifikat) belum tersedia.</p>
                        <p className="text-xs mt-1">Status saat ini: **{record.status}**.</p>
                      </div>
                    )}


                    <hr className="my-4" />

                    {/* DETAIL METADATA IPFS */}
                    <h3 className="font-semibold text-lg border-b pb-1 pt-2">Metadata IPFS (Data Off-Chain)</h3>
                    <div className="grid grid-cols-1 gap-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                        <p className="font-medium">IPFS Hash (Data):</p>
                        <a
                          href={`${IPFS_GATEWAY_URL}${record.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1 truncate font-mono text-xs"
                        >
                          {record?.ipfsHash?.substring(0, 10)}... <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {loadingIpfs ? (
                        <div className="flex items-center text-sm text-gray-500 pt-2">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat metadata dari IPFS...
                        </div>
                      ) : ipfsMetadata ? (
                        <pre className="mt-2 w-full p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 text-xs overflow-x-auto text-wrap">
                          {JSON.stringify(ipfsMetadata, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm italic text-red-500 pt-2">
                          Gagal memuat atau metadata IPFS tidak tersedia untuk hash: **{record.ipfsHash}**.
                        </p>
                      )}
                    </div>

                    <hr className="my-4" />

                    {/* PHOTO */}
                    <h3 className="font-semibold text-lg border-b pb-1 pt-2">
                      Foto Panen
                      <a
                        href={`${IPFS_GATEWAY_URL}${record.photoIpfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 font-normal"
                      >
                        {record.photoIpfsHash} (Lihat Foto Asli) <ExternalLink className="h-3 w-3" />
                      </a>
                    </h3>
                    {record.photoIpfsHash ? (
                      <div className="space-y-2">
                        <img
                          src={`${IPFS_GATEWAY_URL}${record.photoIpfsHash}`}
                          alt={`Foto Panen Batch ${record.batchId}`}
                          className="w-full max-h-[400px] object-contain rounded-lg border"
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">Foto tidak tersedia.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Card>
        </TabsContent>

        {/* TAB AKSI (VERIFIKASI) */}
        <TabsContent value="aksi">
          <VerificationForm
            recordId={record.id}
            currentStatus={record.status}
            onSuccess={reloadRecord} // Memicu pemuatan ulang data setelah sukses
          />
        </TabsContent>
      </Tabs>

    </DashboardLayout >
  )
}