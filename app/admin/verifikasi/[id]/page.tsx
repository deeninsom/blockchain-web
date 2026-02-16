'use client'

import React, { useState, useEffect, useCallback } from "react"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
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

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

type RecordStatus = "PENDING" | "REJECTED" | "VERIFIED" | "CONFIRMED";

interface NetworkTx {
  network: string
  txHash: string
  blockNumber: string
  blockTimestamp: string
}

interface IpfsItem {
  ipfsHash: string
  data: any | null
}

interface HarvestRecord {
  id?: string,
  batchId: string
  location: string
  harvestDate: string
  quantity: string
  unit: string
  photoIpfsHash: string | null
  status: RecordStatus
  networks: NetworkTx[]
  ipfs?: IpfsItem | IpfsItem[]
  productName?: string
  certification?: CertificationData | null
}

interface CertificationData {
  certificateFileHash: string
  networks: NetworkTx[]
  ipfs?: IpfsItem
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                         */
/* -------------------------------------------------------------------------- */

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

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
/* PAGE                                                                        */
/* -------------------------------------------------------------------------- */

export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const batchId = params.id as string
  const { addNotification } = useNotification()

  const [record, setRecord] = useState<HarvestRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  /* ---------------- FETCH ---------------- */

  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;

    try {
      setLoading(true)

      const res = await fetch(`/api/v1/harvest-log/${id}`)
      const r = await res.json()

      if (!r.harvestData) {
        throw new Error("Data panen tidak tersedia")
      }

      const hd = r.harvestData

      const formatted: HarvestRecord = {
        batchId: hd.batchId,
        productName: hd.productName,
        location: hd.location,
        harvestDate: new Date(hd.harvestDate).toLocaleString("id-ID"),
        quantity: parseFloat(hd.quantity || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: hd.unit,
        photoIpfsHash: hd.photoIpfsHash || null,
        status: r.status,
        networks: hd.networks || [],
        ipfs: hd.ipfs ? { ipfsHash: hd.ipfs.batchId, data: hd.ipfs } : undefined,
        certification: r.certificationData ? {
          certificateFileHash: r.certificationData.certificateFileHash,
          networks: r.certificationData.networks || [],
          ipfs: r.certificationData.ipfs
            ? { ipfsHash: r.certificationData.ipfs.certificateId || '', data: r.certificationData.ipfs }
            : undefined
        } : null
      }

      setRecord(formatted)

    } catch (err: any) {
      console.error("Fetch Detail Error:", err)
      addNotification("Error", err.message || "Gagal memuat detail", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchRecordDetail(batchId)
  }, [fetchRecordDetail, batchId])

  /* ---------------- VERIFICATION ---------------- */

  const handleVerify = async () => {
    if (!record) return
    console.log(record)
    try {
      setVerifying(true)
      const res = await fetch(`/api/v1/harvest/record/verify/${batchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Gagal memverifikasi data")

      addNotification("Sukses", "Data berhasil diverifikasi", "success")

      // Ubah status menjadi VERIFIED sesuai backend
      setRecord(prev => prev ? { ...prev, status: "VERIFIED" } : prev)
    } catch (err: any) {
      console.error("Verification Error:", err)
      addNotification("Error", err.message || "Gagal memverifikasi data", "error")
    } finally {
      setVerifying(false)
    }
  }


  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <FarmerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Memuat Detail...
        </div>
      </FarmerLayout>
    )
  }

  if (!record) {
    return (
      <FarmerLayout>
        <div className="text-center py-20">
          <p className="text-lg font-medium">Data tidak ditemukan.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </FarmerLayout>
    )
  }

  /* ---------------- RENDER ---------------- */

  return (
    <FarmerLayout>
      <div className="space-y-6">

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Detail Batch #{record.batchId}</CardTitle>
            <CardDescription>Multi-Chain Blockchain Record</CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">

            {/* DETAIL PANEN */}
            <div>
              <h3 className="font-semibold border-b pb-2 mb-4">Detail Panen</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                <p className="font-medium">Produk:</p>
                <p>{record.productName}</p>

                <p className="font-medium">Lokasi:</p>
                <p>{record.location}</p>

                <p className="font-medium">Kuantitas:</p>
                <p className="font-bold text-primary">
                  {record.quantity} {record.unit}
                </p>

                <p className="font-medium">Tanggal Panen:</p>
                <p>{record.harvestDate}</p>

                <p className="font-medium">Status:</p>
                <p><StatusBadge status={record.status} /></p>
              </div>

              {/* VERIFICATION BUTTON */}
              {/* {record.status === "PENDING" || record.status === "VERIFIED" && (
                <div className="mt-4">
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || record.status === "VERIFIED"}
                    className={`bg-green-600 hover:bg-green-700 text-white ${record.status === "VERIFIED" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {record.status === "VERIFIED" ? "Sudah Diverifikasi" : "Verifikasi Data"}
                  </Button>
                </div>
              )} */}
              <div className="mt-4">
                <Button
                  onClick={handleVerify}
                  // Tombol hanya aktif (disabled={false}) jika status adalah PENDING
                  // Jadi, disabled bernilai TRUE jika status BUKAN PENDING atau sedang proses verifying
                  disabled={verifying || record.status !== "PENDING"}
                  className={`bg-green-600 hover:bg-green-700 text-white ${record.status !== "PENDING" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}

                  {/* Teks dinamis berdasarkan status */}
                  {record.status === "VERIFIED"
                    ? "Sudah Diverifikasi"
                    : record.status === "PENDING"
                      ? "Verifikasi Data"
                      : "Tidak Dapat Diverifikasi"
                  }
                </Button>
              </div>

            </div>

            {/* BLOCKCHAIN */}
            {record.networks.length > 0 && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">
                  Transaksi Blockchain Panen
                </h3>

                <div className="space-y-4">
                  {record.networks.map((net) => (
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
            {record.ipfs && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Metadata IPFS Panen</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(record.ipfs.data, null, 2)}
                </pre>
              </div>
            )}

            {/* FOTO */}
            {record.photoIpfsHash && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Foto Panen</h3>
                <img
                  src={`${IPFS_GATEWAY_URL}${record.photoIpfsHash}`}
                  alt="Foto Panen"
                  className="w-full max-h-[400px] object-contain rounded-lg border"
                />
              </div>
            )}

            {/* CERTIFICATION */}
            {record.certification && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">Sertifikasi</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
                  <p className="font-medium">File Sertifikat:</p>
                  <a
                    href={`${IPFS_GATEWAY_URL}${record.certification.certificateFileHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Lihat Sertifikat
                  </a>
                </div>

                {/* Blockchain Sertifikat */}
                {record.certification.networks.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Transaksi Blockchain Sertifikat</h4>
                    <div className="space-y-4">
                      {record.certification.networks.map((net) => (
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

                {/* IPFS Sertifikat */}
                {record.certification.ipfs && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Metadata IPFS Sertifikat</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(record.certification.ipfs.data, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </FarmerLayout>
  )
}
