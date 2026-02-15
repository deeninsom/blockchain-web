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
  batchId: string
  location: string
  harvestDate: string
  quantity: string
  unit: string
  photoIpfsHash: string | null
  status: RecordStatus
  networks: NetworkTx[]
  ipfs?: IpfsItem | IpfsItem[]
}

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                                */
/* -------------------------------------------------------------------------- */

const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const config = {
    PENDING: { // Menunggu Review Admin
      icon: <Clock className="h-4 w-4 mr-1" />,
      text: "Menunggu Review",
      color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    REJECTED: { // Ditolak Admin
      icon: <Trash className="h-4 w-4 mr-1" />,
      text: "Ditolak ",
      color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400",
    },
    VERIFIED: { // Diverifikasi Admin (Siap ke Blockchain)
      icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />, // Mengubah ini menjadi loader karena biasanya ini adalah state perantara sebelum CONFIRMED
      text: "Diverifikasi",
      color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    CONFIRMED: { // Sudah di Blockchain (Final)
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

  /* ---------------- FETCH ---------------- */

  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;

    try {
      setLoading(true)

      const res = await fetch(`/api/v1/harvest-log/${id}`)
      const r = await res.json()

      const formatted: HarvestRecord = {
        batchId: r.batchId,
        location: r.location,
        harvestDate: new Date(r.harvestDate).toLocaleString("id-ID"),
        quantity: parseFloat(r.quantity || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: r.unit,
        photoIpfsHash: r.photoIpfsHash || null,
        status: r.status,
        networks: r.networks || [],
        ipfs: r.ipfs
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
            </div>

            {/* BLOCKCHAIN */}
            {record.networks.length > 0 && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">
                  Transaksi Blockchain
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

                      <p className="font-mono text-xs break-all">
                        {net.txHash}
                      </p>

                      <p className="text-xs text-muted-foreground mt-2">
                        Block: {net.blockNumber}
                      </p>

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
                <h3 className="font-semibold border-b pb-2 mb-4">
                  Metadata IPFS
                </h3>

                {Array.isArray(record.ipfs) ? (
                  record.ipfs.map((item) => (
                    <div key={item.ipfsHash} className="mb-6">
                      <p className="font-mono text-xs mb-2">
                        {item.ipfsHash}
                      </p>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <>
                    <p className="font-mono text-xs mb-2">
                      {record.ipfs.ipfsHash}
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(record.ipfs.data, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* FOTO */}
            {record.photoIpfsHash && (
              <div>
                <h3 className="font-semibold border-b pb-2 mb-4">
                  Foto Panen
                </h3>

                <img
                  src={`${IPFS_GATEWAY_URL}${record.photoIpfsHash}`}
                  alt="Foto Panen"
                  className="w-full max-h-[400px] object-contain rounded-lg border"
                />
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </FarmerLayout>
  )
}
