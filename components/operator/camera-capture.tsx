// components/farmer/camera-capture.tsx

"use client"

import React, { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button" // Asumsi komponen Button Shadcn
import { Camera, RefreshCcw, X, AlertTriangle, Download } from "lucide-react"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async (mode: 'user' | 'environment') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Browser Anda tidak mendukung kamera.")
      return
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setPhotoDataUrl(null)
    setError(null)
    setStream(null)
    setFacingMode(mode)

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: 1280,
          height: 720,
        },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.play()
      }
      setStream(newStream)
    } catch (err) {
      console.error("Gagal mengakses kamera:", err)
      setError("Izin kamera ditolak atau kamera tidak tersedia.")
    }
  }

  useEffect(() => {
    startCamera(facingMode)

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode])

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setPhotoDataUrl(dataUrl)

        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
        }
      }
    }
  }

  const savePhoto = () => {
    if (!photoDataUrl) return

    const byteString = atob(photoDataUrl.split(',')[1])
    const mimeString = photoDataUrl.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })

    const fileName = `panen-${new Date().toISOString().replace(/[:.]/g, '-')}.jpeg`
    const photoFile = new File([blob], fileName, { type: mimeString })

    onCapture(photoFile)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-2xl sm:h-auto sm:max-h-[95vh] bg-card rounded-none sm:rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-6 w-6" /> Ambil Foto Panen
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="relative flex-grow min-h-0 flex items-center justify-center bg-gray-900 overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 p-4 z-10 text-white">
              <AlertTriangle className="h-6 w-6 mr-2" /> {error}
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            hidden={!stream || !!photoDataUrl}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {photoDataUrl && (
            <img
              src={photoDataUrl}
              alt="Preview Foto Panen"
              className="w-full h-full object-contain rounded-md border border-primary"
            />
          )}
        </div>

        <div className="p-4 flex flex-wrap justify-between gap-3 border-t border-border flex-shrink-0">
          {photoDataUrl ? (
            <>
              <Button
                onClick={() => startCamera(facingMode)}
                variant="outline"
                className="flex-1 bg-muted hover:bg-muted/80"
              >
                <RefreshCcw className="h-4 w-4 mr-2" /> Ambil Ulang
              </Button>
              <Button
                onClick={savePhoto}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-2" /> Simpan & Selesai
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                variant="outline"
                disabled={!stream}
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RefreshCcw className="h-4 w-4 mr-2" /> Balik Kamera
              </Button>
              <Button
                onClick={takePhoto}
                disabled={!stream || !!error}
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold"
              >
                <Camera className="h-6 w-6 mr-2" /> JEPET!
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}