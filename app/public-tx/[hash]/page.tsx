'use client'
import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, XCircle, ArrowLeft, ExternalLink, Hash, Clock, Zap } from "lucide-react"

/* -------------------------------------------------------------------------- */
/* TYPES & CONSTANTS                                                          */
/* -------------------------------------------------------------------------- */
interface DecodedEvent {
  eventName: string;
  batchId: string;
  actorAddress: string;
  eventType: number;
  ipfsHash: string;
  timestamp: string;
}

interface DecodedTxData {
  status: 'VERIFIED' | 'FAILURE' | 'PENDING';
  txHash: string;
  blockNumber: number | string;
  gasUsed: string;
  eventsEmitted: number;
  decodedEvent: DecodedEvent | null;
}

const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

/* -------------------------------------------------------------------------- */
/* UTILITY COMPONENTS                                                         */
/* -------------------------------------------------------------------------- */
const TxStatusDisplay: React.FC<{ status: DecodedTxData['status'] }> = ({ status }) => {
  const config = {
    VERIFIED: { icon: <CheckCircle className="h-5 w-5 mr-2 text-green-600" />, text: "Verified", color: "text-green-600" },
    FAILURE: { icon: <XCircle className="h-5 w-5 mr-2 text-red-600" />, text: "Failed", color: "text-red-600" },
    PENDING: { icon: <Loader2 className="h-5 w-5 mr-2 animate-spin text-yellow-600" />, text: "Pending/Not Found", color: "text-yellow-600" },
  };
  const { icon, text, color } = config[status];
  return <span className={`flex items-center text-lg font-bold ${color}`}>{icon}{text}</span>;
};

const DataRow: React.FC<{ label: string; value: React.ReactNode; monospace?: boolean }> = ({ label, value, monospace = false }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 py-3">
    <p className="font-medium col-span-1 text-gray-500">{label}</p>
    <div className={`col-span-3 break-all text-gray-800 dark:text-gray-200 ${monospace ? 'font-mono text-sm' : ''}`}>{value}</div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN PAGE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function TransactionExplorerPage() {
  const params = useParams();
  const router = useRouter();
  const txHash = params.hash as string;

  const [data, setData] = useState<DecodedTxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/blockchain/tx/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch transaction data.");
      }

      const parsedData: DecodedTxData = {
        ...json.data,
        blockNumber: json.data.blockNumber?.toLocaleString('id-ID') || 'N/A'
      };

      setData(parsedData);

    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (txHash) {
      fetchData(txHash);
    }
  }, [fetchData, txHash]);

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="mr-2 h-6 w-6 animate-spin mx-auto text-primary" /> Loading Transaction Data...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">Error: {error}</div>;
  }

  if (!data) return <div className="p-10 text-center">No data found for this transaction hash.</div>;

  const event = data.decodedEvent;

  return (
    <div className="container mx-auto p-4 md:p-8">


      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b p-6 flex-row items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Hash className="h-6 w-6 text-primary" /> Transaction Hash
            </CardTitle>
            <CardDescription className="font-mono text-sm mt-1 break-all">{data.txHash}</CardDescription>
          </div>
          <TxStatusDisplay status={data.status} />
        </CardHeader>
        <CardContent className="pt-6">

          {/* TRANSACTION SUMMARY */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <DataRow label="Block Number" value={data.blockNumber} />
            <DataRow label="Gas Used" value={<span>{data.gasUsed} <Zap className="h-4 w-4 inline text-yellow-600" /></span>} />
            <DataRow label="Events Emitted" value={data.eventsEmitted} />
          </div>

          <Separator className="my-6" />

          {/* DECODED EVENT DATA */}
          <h3 className="text-lg font-semibold mb-2">Decoded Contract Event</h3>
          {event ? (
            <div className="space-y-1">
              <DataRow label="Contract Event" value={event.eventName} />
              <DataRow label="Timestamp" value={<span className="flex items-center gap-1">{new Date(event.timestamp).toLocaleString("id-ID")} <Clock className="h-4 w-4 text-gray-400" /></span>} />
              <DataRow label="Actor Address" value={event.actorAddress} monospace />

              <DataRow label="Batch ID" value={<span className="font-bold text-lg text-primary">{event.batchId}</span>} />
              <DataRow label="Event Type Code" value={`${event.eventType} (e.g., Harvest, Send)`} />

              <DataRow
                label="IPFS Hash (Data)"
                value={
                  <a
                    href={`${IPFS_GATEWAY_URL}${event.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {event.ipfsHash} <ExternalLink className="h-4 w-4" />
                  </a>
                }
                monospace
              />
            </div>
          ) : (
            <p className="text-muted-foreground italic p-3 border rounded-md">
              No specific Supply Chain event found (ProductEvent) or logs could not be decoded.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}