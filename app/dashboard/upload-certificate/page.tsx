"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useNotification } from "@/lib/notification-context"

interface Certificate {
  id: string
  productId: string
  certificateType: string
  uploadDate: string
  expiryDate: string
  status: "active" | "expired"
}

export default function UploadCertificatePage() {
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: "1",
      productId: "PROD001",
      certificateType: "Organic Certification",
      uploadDate: "2024-01-15",
      expiryDate: "2025-01-15",
      status: "active",
    },
    {
      id: "2",
      productId: "PROD002",
      certificateType: "Quality Assurance",
      uploadDate: "2024-01-10",
      expiryDate: "2024-01-09",
      status: "expired",
    },
  ])
  const [newCert, setNewCert] = useState({
    productId: "",
    certificateType: "",
    expiryDate: "",
  })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const uploadCertificate = () => {
    if (newCert.productId && newCert.certificateType && newCert.expiryDate) {
      const cert = {
        id: Date.now().toString(),
        productId: newCert.productId,
        certificateType: newCert.certificateType,
        uploadDate: new Date().toLocaleDateString(),
        expiryDate: newCert.expiryDate,
        status: new Date(newCert.expiryDate) > new Date() ? "active" : "expired",
      }
      setCertificates([...certificates, cert])
      setNewCert({ productId: "", certificateType: "", expiryDate: "" })
      setDialogOpen(false)
      addNotification("Certificate Uploaded", `${cert.certificateType} for ${cert.productId} uploaded`, "success")
    }
  }

  const deleteCertificate = (id: string) => {
    const cert = certificates.find((c) => c.id === id)
    setCertificates(certificates.filter((c) => c.id !== id))
    addNotification("Certificate Deleted", `${cert?.certificateType} has been removed`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Upload Certificate</h1>
            <p className="text-muted-foreground mt-1">Manage product certifications</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Upload Certificate</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Product Certificate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Product ID"
                  value={newCert.productId}
                  onChange={(e) => setNewCert({ ...newCert, productId: e.target.value })}
                />
                <Input
                  placeholder="Certificate Type"
                  value={newCert.certificateType}
                  onChange={(e) => setNewCert({ ...newCert, certificateType: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Expiry Date"
                  value={newCert.expiryDate}
                  onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                />
                <Button onClick={uploadCertificate} className="w-full bg-primary hover:bg-primary/90">
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Certificates */}
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="bg-card/50 backdrop-blur border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{cert.certificateType}</h3>
                      <Badge variant={cert.status === "active" ? "default" : "destructive"}>{cert.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Product: {cert.productId}</p>
                    <p className="text-sm text-muted-foreground">
                      Upload: {cert.uploadDate} | Expiry: {cert.expiryDate}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCertificate(cert.id)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
