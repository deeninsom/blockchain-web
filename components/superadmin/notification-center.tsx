"use client"

import { X, CheckCircle, AlertCircle, Info, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface Notification {
  id: string
  type: "success" | "warning" | "info"
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface NotificationCenterProps {
  onClose: () => void
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "Shipment Delivered",
      message: "Order #12345 has been successfully delivered to the destination.",
      timestamp: "2 minutes ago",
      read: false,
    },
    {
      id: "2",
      type: "info",
      title: "QR Code Generated",
      message: "New QR code generated for batch BTC-2024-001",
      timestamp: "15 minutes ago",
      read: false,
    },
    {
      id: "3",
      type: "warning",
      title: "Verification Pending",
      message: "Document verification for shipment #67890 is pending approval.",
      timestamp: "1 hour ago",
      read: true,
    },
  ])

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-card border-l border-border z-40 flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
                notification.read ? "border-border bg-transparent" : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm">{notification.title}</h3>
                    {!notification.read && <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{notification.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <Button variant="outline" className="w-full text-foreground border-border hover:bg-muted bg-transparent">
          Clear All
        </Button>
      </div>
    </div>
  )
}
