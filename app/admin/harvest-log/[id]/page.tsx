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

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY;

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                                */
/* -------------------------------------------------------------------------- */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, any> = {
    PENDING: { icon: <Clock className="h-4 w-4 mr-1" />, text: "Menunggu Review", color: "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300" },
    REJECTED: { icon: <Trash className="h-4 w-4 mr-1" />, text: "Ditolak", color: "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400" },
    VERIFIED: { icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />, text: "Diverifikasi", color: "text-indigo-700 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
    CONFIRMED: { icon: <CheckCircle className="h-4 w-4 mr-1" />, text: "Confirmed", color: "text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400" },
  }
  const currentConfig = config[status] || config.PENDING;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.color}`}>{currentConfig.icon}{currentConfig.text}</span>
}

/* -------------------------------------------------------------------------- */
/* NETWORK EXPLORER URL                                                         */
/* -------------------------------------------------------------------------- */
const getExplorerUrl = (network: string, txHash: string) => {
  switch (network?.toUpperCase()) {
    case "SEPOLIA": return `https://sepolia.etherscan.io/tx/${txHash}`;
    case "AMOY": return `https://amoy.polygonscan.com/tx/${txHash}`;
    default: return "#";
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                        */
/* -------------------------------------------------------------------------- */
export default function HarvestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const batchId = params.id as string
  const { addNotification } = useNotification()

  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchRecordDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/harvest-log/${id}`)
      const r = await res.json()
      setRecord(r)
    } catch (err: any) {
      console.error(err)
      addNotification("Error", err.message || "Gagal memuat detail", "error")
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchRecordDetail(batchId)
  }, [fetchRecordDetail, batchId])

  if (loading) return (
    <FarmerLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Memuat Detail...
      </div>
    </FarmerLayout>
  )

  if (!record) return (
    <FarmerLayout>
      <div className="text-center py-20">
        <p className="text-lg font-medium">Data tidak ditemukan.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    </FarmerLayout>
  )

  return (
    <FarmerLayout>
      <div className="space-y-6">

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>

        {/* ----------------- HARVEST DATA ----------------- */}
        {record.harvestData && record.harvestData.length > 0 && record.harvestData.map((item: any) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>Detail Panen #{item.batchId}</CardTitle>
              <CardDescription>Multi-Chain Blockchain Record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                <p className="font-medium">Lokasi:</p><p>{item.location}</p>
                <p className="font-medium">Produk:</p><p>{item.productName}</p>
                <p className="font-medium">Tanggal Panen:</p><p>{new Date(item.harvestDate).toLocaleString("id-ID")}</p>
                <p className="font-medium">Kuantitas:</p><p className="font-bold text-primary">{item.quantity} {item.unit}</p>
                <p className="font-medium">Status:</p><p><StatusBadge status={record.status} /></p>
              </div>

              {/* Foto Panen */}
              {item.photoIpfsHash && (
                <img
                  src={`${IPFS_GATEWAY_URL}${item.photoIpfsHash}`}
                  alt="Foto Panen"
                  className="w-full max-h-[400px] object-contain rounded-lg border"
                />
              )}

              {/* Blockchain Networks */}
              {item.networks.length > 0 && (
                <div className="space-y-2">
                  {item.networks.map((net: any) => (
                    <div key={net.txHash} className="border rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{net.network}</span>
                        <a href={getExplorerUrl(net.network, net.txHash)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="font-mono text-xs break-all">{net.txHash}</p>
                      <p className="text-xs text-muted-foreground">Block: {net.blockNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(net.blockTimestamp).toLocaleString("id-ID")}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* IPFS Metadata */}
              {item.ipfs && (
                <div>
                  <h4 className="font-semibold border-b pb-1 mt-4 mb-2">Metadata IPFS</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(item.ipfs, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* ----------------- CERTIFICATION DATA ----------------- */}
        {record.certificationData && record.certificationData.length > 0 && record.certificationData.map((cert: any) => (
          <Card key={cert.id} className="border-2 border-yellow-400">
            <CardHeader>
              <CardTitle>Sertifikasi #{cert.batchId}</CardTitle>
              <CardDescription>Informasi Sertifikasi & Blockchain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                <p className="font-medium">Certificate File:</p>
                {cert.certificateFileHash ? (
                  <a href={`${IPFS_GATEWAY_URL}${cert.certificateFileHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Lihat Sertifikat
                  </a>
                ) : <p>-</p>}
                <p className="font-medium">Issued By:</p><p>{cert.issuedByUserId || "-"}</p>
                <p className="font-medium">Notes:</p><p>{cert.notes || "-"}</p>
                <p className="font-medium">Expiry Date:</p><p>{cert.expiryDate || "-"}</p>
              </div>

              {/* Blockchain Networks */}
              {cert.networks.length > 0 && (
                <div className="space-y-2 mt-2">
                  {cert.networks.map((net: any) => (
                    <div key={net.txHash} className="border rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{net.network}</span>
                        <a href={getExplorerUrl(net.network, net.txHash)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="font-mono text-xs break-all">{net.txHash}</p>
                      <p className="text-xs text-muted-foreground">Block: {net.blockNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(net.blockTimestamp).toLocaleString("id-ID")}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* IPFS Metadata */}
              {cert.ipfs && (
                <div>
                  <h4 className="font-semibold border-b pb-1 mt-4 mb-2">Metadata IPFS</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(cert.ipfs, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

      </div>
    </FarmerLayout>
  )
}
