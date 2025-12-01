"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { QRCameraScanner } from "@/components/qr-camera-scanner"
import { useNotification } from "@/lib/notification-context"

interface ScanRecord {
  id: string
  qrCode: string
  scannerLocation: string
  timestamp: string
  consumerId: string
}

export default function ConsumerScanPage() {
  const [scans, setScans] = useState<ScanRecord[]>([
    {
      id: "1",
      qrCode: "QR001",
      scannerLocation: "Store Jakarta",
      timestamp: "2024-01-16 10:30",
      consumerId: "CONS001",
    },
    {
      id: "2",
      qrCode: "QR002",
      scannerLocation: "Store Bandung",
      timestamp: "2024-01-16 11:15",
      consumerId: "CONS002",
    },
  ])
  const [newScan, setNewScan] = useState({ qrCode: "", location: "", consumerId: "" })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { addNotification } = useNotification()

  const recordScan = () => {
    if (newScan.qrCode && newScan.location && newScan.consumerId) {
      const newRecord: ScanRecord = {
        id: Date.now().toString(),
        qrCode: newScan.qrCode,
        scannerLocation: newScan.location,
        timestamp: new Date().toLocaleString(),
        consumerId: newScan.consumerId,
      }
      setScans([...scans, newRecord])
      setNewScan({ qrCode: "", location: "", consumerId: "" })
      setDialogOpen(false)
      addNotification("Scan Recorded", `QR Code ${newRecord.qrCode} recorded successfully`, "success")
    }
  }

  const deleteScan = (id: string) => {
    const scanToDelete = scans.find((s) => s.id === id)
    setScans(scans.filter((s) => s.id !== id))
    addNotification("Scan Deleted", `Scan ${scanToDelete?.qrCode} has been deleted`, "info")
  }

  const handleCameraScan = (qrCode: string) => {
    setNewScan((prev) => ({ ...prev, qrCode }))
    setCameraOpen(false)
    addNotification("QR Code Detected", `QR Code ${qrCode} captured`, "success")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Consumer Scan</h1>
            <p className="text-muted-foreground mt-1">Track QR code scans by consumers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Record Scan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Consumer Scan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="QR Code ID"
                    value={newScan.qrCode}
                    onChange={(e) => setNewScan({ ...newScan, qrCode: e.target.value })}
                  />
                  <Button onClick={() => setCameraOpen(true)} variant="outline" className="whitespace-nowrap">
                    Open Camera
                  </Button>
                </div>
                <Input
                  placeholder="Scanner Location"
                  value={newScan.location}
                  onChange={(e) => setNewScan({ ...newScan, location: e.target.value })}
                />
                <Input
                  placeholder="Consumer ID"
                  value={newScan.consumerId}
                  onChange={(e) => setNewScan({ ...newScan, consumerId: e.target.value })}
                />
                <Button onClick={recordScan} className="w-full bg-primary hover:bg-primary/90">
                  Record Scan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scans List */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Scan Records</CardTitle>
            <CardDescription>Consumer QR code scan history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{scan.qrCode}</p>
                      <Badge variant="outline" className="text-xs">
                        {scan.consumerId}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{scan.scannerLocation}</p>
                    <p className="text-xs text-muted-foreground">{scan.timestamp}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteScan(scan.id)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <QRCameraScanner isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onScan={handleCameraScan} />
    </DashboardLayout>
  )
}
