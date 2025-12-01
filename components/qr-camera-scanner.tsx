"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      try {
        setErrorMessage("")
        setCameraAvailable(true)
        const stream = await navigator.mediaDevices?.getUserMedia({
          video: { facingMode: "environment" },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsScanning(true)
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
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [isOpen])

  const handleManualInput = () => {
    if (manualQRCode.trim()) {
      onScan(manualQRCode)
      setManualQRCode("")
      handleClose()
    }
  }

  const handleClose = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setIsScanning(false)
    setManualQRCode("")
    onClose()
  }

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

          {cameraAvailable && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
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
              Scan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
