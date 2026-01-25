"use client"

import { useState, useEffect } from 'react';
import Cookies from "js-cookie";
import { jwtDecode } from 'jwt-decode';
import Lottie from "lottie-react"
import DashboardAnimation from "@/public/animations/welcome.json"
import { ShieldCheck, Activity, LayoutGrid } from "lucide-react"; // Ikon tambahan

interface AuthTokenPayload {
  name: string;
}

export function AdminContent() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode<AuthTokenPayload>(token);
        setUserName(decoded?.name || 'Pengguna');
      } catch (error) {
        setUserName('Pengguna');
      }
    }
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Dekorasi Background Halus (Blobs) */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

      {/* Main Card Container */}
      <div className="w-full max-w-2xl bg-background/40 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-primary/5 flex flex-col items-center text-center space-y-6">

        {/* Badge Status */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top duration-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Sistem Aktif & Terverifikasi
        </div>

        {/* Typography Section */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground leading-tight">
            Selamat Datang, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              {userName?.split(' ')[0].toUpperCase() || 'PENGGUNA'}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Infrastruktur ledger Anda berada dalam kondisi optimal. Pantau aktivitas node dan integritas data secara real-time.
          </p>
        </div>

        {/* Footer Info / Mini Stats */}
        <div className="pt-8 w-full border-t border-border/50 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-5 h-5 text-primary opacity-70" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Keamanan</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Activity className="w-5 h-5 text-primary opacity-70" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Node Aktif</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <LayoutGrid className="w-5 h-5 text-primary opacity-70" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Panel Kontrol</span>
          </div>
        </div>

      </div>

      {/* Versi Halus Garis Pemisah */}
      <div className="mt-8 flex gap-1.5">
        <div className="w-8 h-1 bg-primary rounded-full" />
        <div className="w-2 h-1 bg-primary/30 rounded-full" />
        <div className="w-2 h-1 bg-primary/10 rounded-full" />
      </div>

    </div>
  )
}