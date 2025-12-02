"use client"

import { Bell, Menu, LogOut, User2, X, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState } from "react"
// Asumsi Anda memiliki komponen Button atau menggunakan utility untuk styling
// Jika Anda menggunakan library UI seperti shadcn/ui, ganti div modal di bawah dengan komponen Modal/Dialog mereka.
import { cn } from "@/lib/utils"

interface HeaderProps {
  onToggleSidebar: () => void
  onToggleNotifications: () => void
  userName?: string;
  userRole?: string;
}

export function Header({ userName = "Pengguna", userRole = "Petani", ...props }: HeaderProps) {
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
      {/* Struktur Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="px-6 py-3 flex items-center justify-between h-16">
          {/* Tombol Toggle Sidebar (Mobile) */}
          <button
            onClick={props.onToggleSidebar}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors mr-4"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          {/* Info User di sisi kiri (hanya muncul di layar besar) */}
          <div className="hidden sm:flex flex-col justify-center">
            <h1 className="text-lg font-semibold text-foreground">{userRole} Panel</h1>
            <p className="text-sm text-muted-foreground">Selamat datang, {userName}</p>
          </div>


          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Notification Button */}
            <button
              onClick={props.onToggleNotifications}
              className="relative p-2 hover:bg-muted rounded-full transition-colors group"
            >
              <Bell className="h-5 w-5 text-foreground" />
              <span className="absolute -top-0.5 right-0.5 h-4 w-4 bg-red-500 text-xs text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                3
              </span>
            </button>

            {/* User Menu & Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              {/* Info user di sebelah ikon */}
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>

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

      {/* Modal Konfirmasi Logout */}
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