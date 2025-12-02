"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, PenTool, FileText, Eye, ChevronDown, User2, Settings, Wheat } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)

  useEffect(() => {
    const menuItems = [
      {
        label: "Harvest",
        paths: ["/farmer/record-harvest"],
      }
    ]

    for (const menu of menuItems) {
      if (menu.paths.some((path) => pathname.startsWith(path))) {
        setExpandedMenu(menu.label)
        return
      }
    }
    setExpandedMenu(null)
  }, [pathname])

  const menuItems = [
    {
      label: "Dashboard",
      icon: BarChart3,
      href: "/farmer",
    },
    {
      label: "Harvest",
      icon: Wheat,
      submenu: [
        { label: "Record Harvest", href: "/farmer/record-harvest" }
      ],
    },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 lg:hidden z-20" onClick={onToggle} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold">M</span>
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground">Metamask</h2>
            <p className="text-xs text-muted-foreground">Supply Chain</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const hasActiveSubmenu = item.submenu?.some((sub) => pathname === sub.href)

            return (
              <div key={item.label}>
                {item.submenu ? (
                  <button
                    onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      hasActiveSubmenu
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "hover:bg-sidebar-accent text-sidebar-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", expandedMenu === item.label && "rotate-180")}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )}

                {/* Submenu */}
                {item.submenu && expandedMenu === item.label && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-sidebar-accent pl-3">
                    {item.submenu.map((subitem) => {
                      const isSubitemActive = pathname === subitem.href

                      return (
                        <Link
                          key={subitem.label}
                          href={subitem.href}
                          className={cn(
                            "block px-4 py-2 rounded-lg text-sm transition-colors",
                            isSubitemActive
                              ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                          )}
                        >
                          {subitem.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="px-4 py-3 rounded-lg bg-sidebar-accent/50">
            <p className="text-xs font-semibold text-sidebar-foreground mb-1">Version</p>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
