"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useNotification } from "@/lib/notification-context"

interface Document {
  id: string
  name: string
  type: string
  uploadedDate: string
  size: string
  status: "verified" | "pending" | "rejected"
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "Invoice_001.pdf",
      type: "Invoice",
      uploadedDate: "2024-01-15",
      size: "2.3 MB",
      status: "verified",
    },
    {
      id: "2",
      name: "Shipping_Manifest_001.pdf",
      type: "Shipping",
      uploadedDate: "2024-01-14",
      size: "1.8 MB",
      status: "pending",
    },
  ])
  const [newDoc, setNewDoc] = useState({ name: "", type: "" })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const uploadDocument = () => {
    if (newDoc.name && newDoc.type) {
      const doc = {
        id: Date.now().toString(),
        name: newDoc.name,
        type: newDoc.type,
        uploadedDate: new Date().toLocaleDateString(),
        size: "0 MB",
        status: "pending",
      }
      setDocuments([...documents, doc])
      setNewDoc({ name: "", type: "" })
      setDialogOpen(false)
      addNotification("Document Uploaded", `${doc.name} uploaded successfully`, "success")
    }
  }

  const deleteDocument = (id: string) => {
    const doc = documents.find((d) => d.id === id)
    setDocuments(documents.filter((d) => d.id !== id))
    addNotification("Document Deleted", `${doc?.name} has been removed`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">Manage supply chain documents</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Upload Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Document Name"
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                />
                <Input
                  placeholder="Document Type (Invoice, Shipping, etc.)"
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                />
                <Button onClick={uploadDocument} className="w-full bg-primary hover:bg-primary/90">
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents List */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>Uploaded supply chain documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{doc.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.uploadedDate} · {doc.size}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        doc.status === "verified" ? "default" : doc.status === "pending" ? "secondary" : "destructive"
                      }
                    >
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
