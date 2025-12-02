"use client"

import { Bell, Menu, LogOut } from "lucide-react"

interface HeaderProps {
  onToggleSidebar: () => void
  onToggleNotifications: () => void
}

export function Header({ onToggleSidebar, onToggleNotifications }: HeaderProps) {
  const handleLogout = () => {
    window.location.href = "/"
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {/* Notification Button */}
          <button
            onClick={onToggleNotifications}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors group"
          >
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-xs text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
              3
            </span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-semibold">JD</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-destructive/20 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
