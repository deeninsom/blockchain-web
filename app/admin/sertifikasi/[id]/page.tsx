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
import { Loader2, ArrowLeft, CheckCircle, Trash, Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams, useRouter } from "next/navigation"

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */
const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "http://127.0.0.1:8080/ipfs/"

const getExplorerUrl = (network: string, txHash: string) => {
  switch (network?.toUpperCase()) {
    case "SEPOLIA":
      return `https://sepolia.etherscan.io/tx/${txHash}`
    case "AMOY":
      return `https://amoy.polygonscan.com/tx/${txHash}`
    default:
      return `#`
  }
}

type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";

const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const config = {
    PENDING: {
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Menunggu Review",
      color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    REJECTED: {
      icon: <Trash className="h-4 w-4 mr-1" />,
      text: "Ditolak",
      color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
    },
    VERIFIED: {
      icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />,
      text: "Diverifikasi",
      color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    CONFIRMED: {
      icon: <CheckCircle className="h-4 w-4 mr-1" />,
      text: "Confirmed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400",
    },
  }

  const currentConfig = config[status] || config.PENDING;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>
      {currentConfig.icon}
      {currentConfig.text}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */
export default function SertifikasiDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string
  const { addNotification } = useNotification()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
    try {
      setSubmitting(true);

      const res = await fetch(
        `/api/v1/harvest/record/sertified/${recordId}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(`Server Error: ${res.status}`);
      }

      await res.json();
      addNotification("Sukses", "Sertifikasi berhasil disetujui.", "success");

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

  // Derived properties exactly like harvest-log
  const harvestData = data.harvestData || data.applicationData;
  const certification = data.certificationData;

  return (
    <AdminLayout>
      <div className="space-y-6">

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detail Pengajuan Sertifikasi #{data.batchId}
            </CardTitle>
            <CardDescription>Review detail data panen untuk proses persetujuan.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">

            {/* DETAIL PANEN */}
            {harvestData && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Detail Panen / Pengajuan</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                  <p className="font-medium">Nama Petani:</p>
                  <p>{harvestData.farmerName || "N/A"}</p>

                  <p className="font-medium">Wallet Petani:</p>
                  <p className="break-all">{harvestData.farmerAddress || "N/A"}</p>

                  <p className="font-medium">Produk:</p>
                  <p>{harvestData.productName}</p>

                  <p className="font-medium">Lokasi:</p>
                  <p>{harvestData.location}</p>

                  <p className="font-medium">Kuantitas:</p>
                  <p className="font-bold text-primary">
                    {harvestData.quantity} {harvestData.unit}
                  </p>

                  <p className="font-medium">Tanggal Panen:</p>
                  <p>{harvestData.harvestDate ? new Date(harvestData.harvestDate).toLocaleString("id-ID") : "N/A"}</p>

                  <p className="font-medium">Status Pengajuan:</p>
                  <p><StatusBadge status={data.status as RecordStatus} /></p>
                </div>
              </div>
            )}

            {/* FOTO */}
            {harvestData?.photoIpfsHash && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Foto Panen</h3>
                <img
                  src={`${IPFS_GATEWAY_URL}${harvestData.photoIpfsHash}`}
                  alt="Foto Panen"
                  className="w-full max-h-[400px] object-contain rounded-lg border"
                />
              </div>
            )}

            {/* BLOCKCHAIN PANEN */}
            {harvestData?.networks?.length > 0 && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">
                  Transaksi Blockchain Panen
                </h3>

                <div className="space-y-4">
                  {harvestData.networks.map((net: any) => (
                    <div key={net.txHash} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{net.network}</span>
                        <a
                          href={getExplorerUrl(net.network, net.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1 text-xs"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <p className="font-mono text-xs break-all">{net.txHash}</p>
                      <p className="text-xs text-muted-foreground mt-2">Block: {net.blockNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(net.blockTimestamp).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IPFS DATA */}
            {harvestData?.ipfs && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Metadata IPFS Panen</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(harvestData.ipfs, null, 2)}
                </pre>
              </div>
            )}

            {/* CERTIFICATION */}
            {certification && (
              <div className="mt-8 border-t pt-8">
                <h3 className="font-semibold border-b pb-2 mb-4 text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Data Sertifikasi Terbit
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                  <p className="font-medium">File Sertifikat (Sistem):</p>
                  {certification.certificateFileHash ? (
                    <a
                      href={`${IPFS_GATEWAY_URL}${certification.certificateFileHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      Lihat Sertifikat <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <p>N/A</p>}
                </div>

                {/* Blockchain Sertifikat */}
                {certification.networks?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Transaksi Blockchain Sertifikat (TxHash)</h4>
                    <div className="space-y-4">
                      {certification.networks.map((net: any) => (
                        <div key={net.txHash} className="border border-green-200 bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-green-700 dark:text-green-400">{net.network}</span>
                            <a
                              href={getExplorerUrl(net.network, net.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline flex items-center gap-1 text-xs"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <p className="font-mono text-xs break-all text-green-800 dark:text-green-300">{net.txHash}</p>
                          <p className="text-xs text-green-700/70 mt-2">Block: {net.blockNumber}</p>
                          <p className="text-xs text-green-700/70">
                            {new Date(net.blockTimestamp).toLocaleString("id-ID")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IPFS Sertifikat */}
                {certification.ipfs && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Metadata IPFS Sertifikat</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(certification.ipfs, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            )}

            {/* FINAL VERIFICATION BUTTON */}
            {(!certification && (data.status === "VERIFIED" || data.status === "PENDING")) && (
              <div className="space-y-6 border-t pt-8 text-center mt-8">
                <div>
                  <h3 className="font-semibold text-xl">
                    🧾 Persetujuan Sertifikasi
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Semua data pengajuan di atas sudah disajikan berdasarkan catatan Blockchain dan IPFS. 
                    <br/>Klik tombol di bawah untuk menyetujui penerbitan sertifikat ini ke jaringan Blockchain.
                  </p>
                </div>

                <div className="pt-4 flex justify-center">
                  <Button
                    onClick={handleVerification}
                    disabled={submitting}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {submitting
                      ? "Menyetujui & Mencatat ke Blockchain..."
                      : "Setuju & Konfirmasi"}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
