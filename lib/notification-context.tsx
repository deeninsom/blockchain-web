"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"

export interface NotificationMessage {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  timestamp: string
}

interface NotificationContextType {
  notifications: NotificationMessage[]
  addNotification: (title: string, message: string, type?: "success" | "error" | "info" | "warning") => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])

  const addNotification = useCallback(
    (title: string, message: string, type: "success" | "error" | "info" | "warning" = "info") => {
      const id = Date.now().toString()
      const newNotification: NotificationMessage = {
        id,
        type,
        title,
        message,
        timestamp: new Date().toLocaleTimeString(),
      }

      setNotifications((prev) => [newNotification, ...prev])

      // Auto remove after 5 seconds
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    },
    [],
  )

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider")
  }
  return context
}
