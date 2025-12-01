"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useNotification } from "@/lib/notification-context"

interface ComparisonData {
  id: string
  productA: string
  productB: string
  quality: string
  difference: string
}

export default function DataComparisonPage() {
  const [comparisons, setComparisons] = useState<ComparisonData[]>([
    {
      id: "1",
      productA: "Batch A001",
      productB: "Batch A002",
      quality: "Grade A vs Grade A",
      difference: "Temperature control difference",
    },
    {
      id: "2",
      productA: "Batch B001",
      productB: "Batch B002",
      quality: "Grade A vs Grade B",
      difference: "Shipping method variation",
    },
  ])
  const [newComparison, setNewComparison] = useState({ productA: "", productB: "", quality: "", difference: "" })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const addComparison = () => {
    if (newComparison.productA && newComparison.productB) {
      const comparison = { id: Date.now().toString(), ...newComparison }
      setComparisons([...comparisons, comparison])
      setNewComparison({ productA: "", productB: "", quality: "", difference: "" })
      setDialogOpen(false)
      addNotification(
        "Comparison Created",
        `${comparison.productA} vs ${comparison.productB} comparison added`,
        "success",
      )
    }
  }

  const deleteComparison = (id: string) => {
    const comp = comparisons.find((c) => c.id === id)
    setComparisons(comparisons.filter((c) => c.id !== id))
    addNotification("Comparison Deleted", `Comparison deleted successfully`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Data Comparison</h1>
            <p className="text-muted-foreground mt-1">Compare product data and attributes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">New Comparison</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Data Comparison</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Product A ID"
                  value={newComparison.productA}
                  onChange={(e) => setNewComparison({ ...newComparison, productA: e.target.value })}
                />
                <Input
                  placeholder="Product B ID"
                  value={newComparison.productB}
                  onChange={(e) => setNewComparison({ ...newComparison, productB: e.target.value })}
                />
                <Input
                  placeholder="Quality Grade"
                  value={newComparison.quality}
                  onChange={(e) => setNewComparison({ ...newComparison, quality: e.target.value })}
                />
                <Input
                  placeholder="Difference Description"
                  value={newComparison.difference}
                  onChange={(e) => setNewComparison({ ...newComparison, difference: e.target.value })}
                />
                <Button onClick={addComparison} className="w-full bg-primary hover:bg-primary/90">
                  Add Comparison
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Comparisons Table */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Product Comparisons</CardTitle>
            <CardDescription>Side-by-side product data analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Product A</TableHead>
                    <TableHead>Product B</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map((comp) => (
                    <TableRow key={comp.id} className="border-border">
                      <TableCell className="text-foreground">{comp.productA}</TableCell>
                      <TableCell className="text-foreground">{comp.productB}</TableCell>
                      <TableCell className="text-muted-foreground">{comp.quality}</TableCell>
                      <TableCell className="text-muted-foreground">{comp.difference}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComparison(comp.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
