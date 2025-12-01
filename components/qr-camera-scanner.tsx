"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      try {
        setErrorMessage("")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsScanning(true)
        }
      } catch (err) {
        setErrorMessage("Unable to access camera. Please check permissions.")
        console.error("Camera access error:", err)
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

  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    const scanInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Simple QR detection - in production use jsQR library
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        // This is a placeholder - you'd need to use jsQR or similar library
        // For now, we'll simulate QR detection
      }
    }, 500)

    return () => clearInterval(scanInterval)
  }, [isScanning])

  const handleManualInput = (qrCode: string) => {
    onScan(qrCode)
    handleClose()
  }

  const handleClose = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setIsScanning(false)
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
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none">
              <div className="absolute inset-4 border border-dashed border-primary/50 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={() => handleManualInput("QR" + Math.random().toString(36).substr(2, 9))}
              className="flex-1 bg-primary"
            >
              Use Camera
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
