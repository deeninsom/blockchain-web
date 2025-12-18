'use client'

import React, { useState, useEffect, useCallback } from "react"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { useNotification } from "@/lib/notification-context"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2, LinkIcon, ArrowLeft,
  CheckCircle,
  Trash,
  Clock,
  ExternalLink
} from "lucide-react"
import { QRCodeCanvas } from 'qrcode.react';
import { useParams, useRouter } from "next/navigation"

/* -------------------------------------------------------------------------- */
/* TYPES & CONSTANTS                           */
/* -------------------------------------------------------------------------- */
type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";

interface HarvestRecord {
  id: string
  batchId: string
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

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
const EXPLORER_BASE_URL = `${process.env.NEXT_PUBLIC_URL}public-tx/`;


/* -------------------------------------------------------------------------- */
/* STATUS COMPONENT                            */
/* -------------------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
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
      text: "Terverifikasi",
      color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    CONFIRMED: {
      icon: <CheckCircle className="h-4 w-4 mr-1" />,
      text: "Blockchain Confirmed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400",
    },
    UNKNOWN: {
      icon: <Loader2 className="h-4 w-4 mr-1" />,
      text: "Status Tidak Dikenal",
      color: "text-red-500 bg-red-50 dark:bg-red-900/50 dark:text-red-300",
    }
  }

  const statusKey = status as keyof typeof config;
  const currentConfig = config[statusKey] || config.UNKNOWN;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>
      {currentConfig.icon}
      {currentConfig.text}
    </span>
  )
}


export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string
  const { addNotification } = useNotification()

  const [record, setRecord] = useState<HarvestRecord | null>(null)
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingIpfs, setLoadingIpfs] = useState(false)

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
      addNotification("IPFS Error", `Gagal memuat metadata IPFS: ${err.message}`, "error");
    } finally {
      setLoadingIpfs(false);
    }
  }, [addNotification]);

  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/harvest-log/${id}`)

      const r = await res.json()

      const formatted: HarvestRecord = {
        id: r.id,
        batchId: r.batchId,
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

    } catch (err: any) {
      console.error("Fetch Detail Error:", err);
      addNotification("Error", err.message || "Gagal memuat data detail panen", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification, fetchIpfsMetadata])


  useEffect(() => {
    fetchRecordDetail(recordId)
  }, [fetchRecordDetail, recordId])

  if (loading) {
    return (
      <FarmerLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat Detail...
        </div>
      </FarmerLayout>
    )
  }

  if (!record) {
    return (
      <FarmerLayout>
        <div className="text-center py-20">
          <p className="text-lg font-medium">Catatan panen tidak ditemukan.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Riwayat
          </Button>
        </div>
      </FarmerLayout>
    )
  }

  return (
    <FarmerLayout>
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
              <CardTitle>Detail Catatan Panen #{record.batchId}</CardTitle>
              <CardDescription>ID Event: {record.id}</CardDescription>
            </div>

            {/* QR CODE */}
            <div className="flex flex-col items-center gap-1 border p-2 rounded-md bg-white shadow-sm">

              <QRCodeCanvas
                value={record.batchId} // Data yang akan di-encode menjadi QR Code
                size={100}            // Ukuran dalam piksel
                level="H"             // Level koreksi error (L, M, Q, H)
              // Di sini Anda bisa menambahkan props lain seperti bgColor, fgColor, dll.
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
                    {record.ipfsHash.substring(0, 10)}... <ExternalLink className="h-3 w-3" />
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
    </FarmerLayout >
  )
}