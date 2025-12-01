"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useNotification } from "@/lib/notification-context"

interface QRCode {
  id: string
  productId: string
  code: string
  createdAt: string
  scans: number
}

export default function QRCodePage() {
  const [qrCodes, setQRCodes] = useState<QRCode[]>([
    { id: "1", productId: "PROD001", code: "QR001", createdAt: "2024-01-15", scans: 12 },
    { id: "2", productId: "PROD002", code: "QR002", createdAt: "2024-01-15", scans: 8 },
  ])
  const [newQR, setNewQR] = useState("")
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const generateQR = () => {
    if (newQR) {
      const qr = {
        id: Date.now().toString(),
        productId: newQR,
        code: `QR${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toLocaleDateString(),
        scans: 0,
      }
      setQRCodes([...qrCodes, qr])
      setNewQR("")
      setDialogOpen(false)
      addNotification("QR Code Generated", `QR Code ${qr.code} created for ${qr.productId}`, "success")
    }
  }

  const deleteQR = (id: string) => {
    const qr = qrCodes.find((q) => q.id === id)
    setQRCodes(qrCodes.filter((q) => q.id !== id))
    addNotification("QR Code Deleted", `QR Code ${qr?.code} has been removed`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate QR Code</h1>
            <p className="text-muted-foreground mt-1">Create and manage QR codes for products</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Generate QR</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New QR Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Product ID" value={newQR} onChange={(e) => setNewQR(e.target.value)} />
                <Button onClick={generateQR} className="w-full bg-primary hover:bg-primary/90">
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* QR Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="bg-card/50 backdrop-blur border-border">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center h-32">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{qr.code}</p>
                      <p className="text-xs text-muted-foreground mt-2">{qr.productId}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Scans:</span>
                      <Badge>{qr.scans}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Created: {qr.createdAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQR(qr.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
