"use client"

import { useNotification } from "@/lib/notification-context"
import { useEffect, useState } from "react"

export function NotificationToast() {
  const { notifications, removeNotification } = useNotification()
  const [visible, setVisible] = useState<string[]>([])

  useEffect(() => {
    setVisible(notifications.map((n) => n.id))
  }, [notifications])

  const getIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      success: "✓",
      error: "✕",
      info: "ℹ",
      warning: "⚠",
    }
    return iconMap[type] || "ℹ"
  }

  const getColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      success: "bg-green-500/20 border-green-500/30 text-green-600",
      error: "bg-red-500/20 border-red-500/30 text-red-600",
      info: "bg-blue-500/20 border-blue-500/30 text-blue-600",
      warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-600",
    }
    return colorMap[type] || "bg-blue-500/20 border-blue-500/30 text-blue-600"
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`${getColor(notif.type)} border rounded-lg p-4 max-w-sm animate-in slide-in-from-right pointer-events-auto`}
        >
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 font-bold text-lg">{getIcon(notif.type)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{notif.title}</h3>
              <p className="text-sm opacity-90">{notif.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
