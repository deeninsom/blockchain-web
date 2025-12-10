"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Import library QR Decoder: jsQR
import jsQR from "jsqr"

interface QRCameraScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (qrCode: string) => void
}

export function QRCameraScanner({ isOpen, onClose, onScan }: QRCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [manualQRCode, setManualQRCode] = useState("")
  const [cameraAvailable, setCameraAvailable] = useState(true)

  // Handler untuk menutup modal dan menghentikan kamera
  const handleClose = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setIsScanning(false)
    setManualQRCode("")
    onClose()
  }, [onClose])

  // Handler untuk input manual (tidak berubah)
  const handleManualInput = () => {
    if (manualQRCode.trim()) {
      onScan(manualQRCode)
      setManualQRCode("")
      handleClose()
    }
  }

  // --- FUNGSI UTAMA DECODER (SCANNING LOOP) ---
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set dimensi canvas sesuai video
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;

      // Gambar frame video ke canvas
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Ambil data gambar dari canvas
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

      if (imageData) {
        // Gunakan jsQR untuk memindai
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          // QR Code ditemukan!
          setIsScanning(false);
          onScan(code.data); // KIRIM HASIL KE PICKUPPAGE
          handleClose(); // Tutup modal
          return; // Hentikan loop scanning
        }
      }
    }

    // Lanjutkan scanning dengan requestAnimationFrame (untuk efisiensi)
    requestAnimationFrame(tick);
  }, [isScanning, onScan, handleClose]);
  // --- AKHIR FUNGSI UTAMA DECODER ---


  useEffect(() => {
    if (!isOpen) {
      // Pastikan kamera dihentikan saat modal ditutup
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
      return
    }

    const startCamera = async () => {
      try {
        setErrorMessage("")
        setCameraAvailable(true)
        const stream = await navigator.mediaDevices?.getUserMedia({
          // Preferensi 'environment' untuk kamera belakang
          video: { facingMode: "environment" },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Tunggu video dimuat sebelum memulai scanning
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true)
            tick(); // Mulai loop scanning
          };
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setCameraAvailable(false)
        setErrorMessage("Camera not available. Please enter QR code manually below.")
        setIsScanning(false)
      }
    }

    startCamera()

    return () => {
      // Cleanup: Hentikan semua track media saat komponen di-unmount atau modal ditutup
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [isOpen, tick])


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700">
              {errorMessage}
            </div>
          )}

          {/* Jika kamera tersedia, tampilkan video feed */}
          {cameraAvailable && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Canvas disembunyikan, digunakan untuk memproses frame video */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay fokus visual */}
              <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none">
                <div className="absolute inset-4 border border-dashed border-primary/50 rounded-lg" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Enter QR Code</label>
            <Input
              placeholder="Enter QR code manually"
              value={manualQRCode}
              onChange={(e) => setManualQRCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualInput()}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleManualInput}
              disabled={!manualQRCode.trim()}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Submit Manual Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}