"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useNotification } from "@/lib/notification-context"

interface Link {
  id: string
  fromProduct: string
  toProduct: string
  type: string
  timestamp: string
}

export default function LinkingPage() {
  const [links, setLinks] = useState<Link[]>([
    { id: "1", fromProduct: "Batch001", toProduct: "Package001", type: "Packaging", timestamp: "2024-01-15" },
    { id: "2", fromProduct: "Batch002", toProduct: "Package002", type: "Shipment", timestamp: "2024-01-15" },
  ])
  const [newLink, setNewLink] = useState({ fromProduct: "", toProduct: "", type: "" })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const addLink = () => {
    if (newLink.fromProduct && newLink.toProduct && newLink.type) {
      const link = {
        id: Date.now().toString(),
        fromProduct: newLink.fromProduct,
        toProduct: newLink.toProduct,
        type: newLink.type,
        timestamp: new Date().toLocaleDateString(),
      }
      setLinks([...links, link])
      setNewLink({ fromProduct: "", toProduct: "", type: "" })
      setDialogOpen(false)
      addNotification("Link Created", `${link.fromProduct} linked to ${link.toProduct}`, "success")
    }
  }

  const deleteLink = (id: string) => {
    const linkToDelete = links.find((l) => l.id === id)
    setLinks(links.filter((l) => l.id !== id))
    addNotification("Link Deleted", `Link removed successfully`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Linking</h1>
            <p className="text-muted-foreground mt-1">Link products across supply chain stages</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Create Link</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Products</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="From Product ID"
                  value={newLink.fromProduct}
                  onChange={(e) => setNewLink({ ...newLink, fromProduct: e.target.value })}
                />
                <Input
                  placeholder="To Product ID"
                  value={newLink.toProduct}
                  onChange={(e) => setNewLink({ ...newLink, toProduct: e.target.value })}
                />
                <Input
                  placeholder="Link Type (e.g., Packaging, Shipment)"
                  value={newLink.type}
                  onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
                />
                <Button onClick={addLink} className="w-full bg-primary hover:bg-primary/90">
                  Create Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Links Grid */}
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id} className="bg-card/50 backdrop-blur border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">From</p>
                        <p className="text-lg font-semibold text-foreground">{link.fromProduct}</p>
                      </div>
                      <div className="text-2xl text-primary">→</div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">To</p>
                        <p className="text-lg font-semibold text-foreground">{link.toProduct}</p>
                      </div>
                      <div className="ml-auto">
                        <Badge variant="outline">{link.type}</Badge>
                        <p className="text-xs text-muted-foreground mt-2">{link.timestamp}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLink(link.id)}
                    className="text-destructive hover:text-destructive/90 ml-4"
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
