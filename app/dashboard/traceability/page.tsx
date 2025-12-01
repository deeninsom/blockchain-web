"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/lib/notification-context"

interface TraceEvent {
  id: string
  timestamp: string
  location: string
  status: "pending" | "in_transit" | "delivered"
  description: string
}

export default function TraceabilityPage() {
  const [events, setEvents] = useState<TraceEvent[]>([
    {
      id: "1",
      timestamp: "2024-01-15 10:30",
      location: "Farm Jakarta",
      status: "pending",
      description: "Product harvested",
    },
    {
      id: "2",
      timestamp: "2024-01-15 14:20",
      location: "Warehouse Bandung",
      status: "in_transit",
      description: "In transit",
    },
    {
      id: "3",
      timestamp: "2024-01-16 09:00",
      location: "Distribution Center",
      status: "delivered",
      description: "Ready for distribution",
    },
  ])
  const [newEvent, setNewEvent] = useState({ location: "", description: "" })
  const { addNotification } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const addEvent = () => {
    if (newEvent.location && newEvent.description) {
      const event: TraceEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        location: newEvent.location,
        status: "pending",
        description: newEvent.description,
      }
      setEvents([...events, event])
      setNewEvent({ location: "", description: "" })
      setDialogOpen(false)
      addNotification("Event Added", `Traceability event at ${event.location} recorded`, "success")
    }
  }

  const deleteEvent = (id: string) => {
    const eventToDelete = events.find((e) => e.id === id)
    setEvents(events.filter((e) => e.id !== id))
    addNotification("Event Deleted", `Event at ${eventToDelete?.location} has been removed`, "info")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Traceability</h1>
            <p className="text-muted-foreground mt-1">Track product journey across supply chain</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">Add Event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Traceability Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                <Button onClick={addEvent} className="w-full bg-primary hover:bg-primary/90">
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Timeline */}
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Product Timeline</CardTitle>
            <CardDescription>Complete journey of your product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    {index < events.length - 1 && <div className="w-0.5 h-24 bg-border mt-2" />}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{event.location}</h3>
                        <p className="text-sm text-muted-foreground">{event.timestamp}</p>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            event.status === "pending"
                              ? "secondary"
                              : event.status === "in_transit"
                                ? "default"
                                : "outline"
                          }
                        >
                          {event.status.replace("_", " ")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
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
