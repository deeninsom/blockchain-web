"use client"

import { User2, Menu, LogOut, AlertTriangle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onToggleSidebar: () => void
  onToggleNotifications: () => void
}

export function Header({ onToggleSidebar, onToggleNotifications }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // State baru untuk mengontrol tampilan modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fungsi untuk memulai proses: hanya menampilkan modal
  const startLogoutProcess = () => {
    setShowConfirmModal(true);
  };

  // Fungsi untuk membatalkan proses
  const cancelLogout = () => {
    setShowConfirmModal(false);
  };

  // Fungsi yang sebenarnya melakukan logout (dipanggil dari dalam modal)
  const confirmLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirmModal(false); // Sembunyikan modal saat proses dimulai

    try {
      // 1. --- PANGGIL API UNTUK HAPUS COOKIE HTTP-ONLY DI SERVER ---
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // 2. --- HAPUS DATA CACHE DI KLIEN (LOCAL STORAGE, DLL.) ---
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // 3. REDIRECT KE HALAMAN LOGIN
      if (response.ok) {
        console.log("Logout successful. Redirecting.");
      } else {
        console.warn("Server responded with error during logout, but local data cleared. Redirecting.");
      }

      router.push('/');

    } catch (error) {
      console.error("Logout process failed:", error);
      alert("Logout berhasil dilakukan di sisi klien, tetapi terjadi masalah koneksi ke server.");
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  }
  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Notification Button */}
            {/* <button
            onClick={onToggleNotifications}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors group"
          >
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-xs text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
              3
            </span>
          </button> */}

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <button
                onClick={startLogoutProcess} // Panggil fungsi yang menampilkan modal
                disabled={isLoggingOut}
                className="p-2 hover:bg-destructive/20 rounded-lg transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                title={isLoggingOut ? "Sedang Logout..." : "Logout"}
              >
                {isLoggingOut ? <User2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cancelLogout}>
          <div
            className="bg-card rounded-xl p-6 shadow-2xl w-full max-w-sm transform transition-all"
            onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutupnya
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Konfirmasi Logout
              </h3>
              <button onClick={cancelLogout} className="p-1 rounded-full hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Apakah Anda yakin ingin keluar dari Panel Petani? Anda harus memasukkan kredensial Anda lagi untuk masuk.
            </p>

            <div className="flex justify-end gap-3">
              {/* Tombol Batal */}
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                disabled={isLoggingOut}
              >
                Batal
              </button>

              {/* Tombol Konfirmasi Logout */}
              <button
                onClick={confirmLogout}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg text-white bg-destructive hover:bg-destructive/90 transition-colors",
                  isLoggingOut && "opacity-70 cursor-not-allowed"
                )}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Memproses...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
