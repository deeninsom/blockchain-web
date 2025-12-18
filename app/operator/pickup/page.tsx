"use client"

import { useState, useEffect, useCallback } from "react"
import { OperatorLayout } from "@/components/operator/operator-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Truck, MapPin, CheckCircle, Camera, RotateCcw } from 'lucide-react'; // Menambahkan RotateCcw untuk tombol reset
import { useToast } from "@/components/ui/use-toast"

// --- Import Komponen Kamera Anda ---
import { QRCameraScanner } from "@/components/qr-camera-scanner"

// --- Tipe Data Disesuaikan (Mengikuti API Backend) ---
interface PickupFormData {
    batchId: string;
    batchRefId: string;
    farmerAddress: string;
    quantity: string;
    unit: string;
    gpsCoordinates: string; // Akan diisi otomatis
    notes: string;
}

interface ScannedProductData {
    batchId: string;
    batchRefId: string;
    farmerAddress: string;
    farmerName: string;
    initialQuantity: string;
    unit: string;
    status: string;
}

// --- Komponen Utama ---

export default function PickupPage() {
    const { toast } = useToast();
    // const [isScanning, setIsScanning] = useState(true); // DIHAPUS - Logika ditentukan oleh scannedData
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [scannedData, setScannedData] = useState<ScannedProductData | null>(null);
    const [isGpsLoading, setIsGpsLoading] = useState(false); // State untuk status GPS

    const initialFormData: PickupFormData = {
        batchId: "",
        batchRefId: "",
        farmerAddress: "",
        quantity: "0",
        unit: "kg",
        gpsCoordinates: "Mengambil lokasi...", // Nilai default saat loading GPS
        notes: "",
    };

    const [formData, setFormData] = useState<PickupFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handler perubahan form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;

        // Memastikan input kuantitas hanya menerima angka desimal
        const newValue = id === 'quantity' && value.match(/^[0-9]*\.?[0-9]*$/) ? value : value;

        setFormData(prev => ({
            ...prev,
            [id]: newValue,
        }));
    };

    // --- FUNGSI BARU: Mendapatkan Koordinat GPS ---
    const getGeolocation = useCallback(() => {
        if (!navigator.geolocation) {
            setFormData(prev => ({ ...prev, gpsCoordinates: "Geolocation tidak didukung." }));
            toast({
                title: "❌ GPS Gagal",
                description: "Browser Anda tidak mendukung Geolocation API.",
                variant: "destructive",
            });
            return;
        }

        setIsGpsLoading(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                setFormData(prev => ({ ...prev, gpsCoordinates: coordsString }));
                setIsGpsLoading(false);
                toast({
                    title: "✅ GPS Berhasil",
                    description: `Lokasi terdeteksi: ${coordsString}`,
                });
            },
            (error) => {
                let errorMessage = "Gagal mengambil lokasi GPS.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "Izin lokasi ditolak oleh pengguna. Harap berikan izin di pengaturan browser.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = "Informasi lokasi tidak tersedia (Coba di luar ruangan).";
                }

                setFormData(prev => ({ ...prev, gpsCoordinates: "Lokasi tidak tersedia/ditolak." }));
                setIsGpsLoading(false);
                toast({
                    title: "⚠️ GPS Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [toast]);
    // --- AKHIR FUNGSI BARU ---


    useEffect(() => {
        // Panggil fungsi GPS saat komponen dimuat atau direset
        getGeolocation();
    }, [getGeolocation]);


    /**
     * @description Mengambil data batch dari API setelah scan.
     */
    const handleScanResult = async (scannedBatchId: string) => {
        // PERBAIKAN 1: Pastikan Batch ID tidak kosong
        if (!scannedBatchId || scannedBatchId.trim() === "") {
            toast({
                title: "Gagal Scan Produk",
                description: "QR Code kosong atau tidak terbaca.",
                variant: "destructive",
            });
            setIsCameraModalOpen(false);
            return;
        }

        // Abaikan jika Batch ID yang sama baru saja diproses
        if (scannedBatchId === formData.batchId && scannedData !== null) return;

        setIsSubmitting(true);
        setIsCameraModalOpen(false);

        // URL API harus jelas
        const API_GET_ENDPOINT = `/api/v1/logistic/scan/${scannedBatchId}`;

        try {
            toast({
                title: "Memanggil API...",
                description: `Mencari data produk di ${API_GET_ENDPOINT}`,
            });

            // >>> PEMANGGILAN API GET NYATA <<<
            // Simulasi fetch
            const res = await fetch(API_GET_ENDPOINT);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengambil data produk. Batch ID tidak valid atau tidak ditemukan.');
            }

            const result: ScannedProductData = data.data;

            setScannedData(result);

            // AUTO FILL FIELD DARI HASIL SCAN
            setFormData(prev => ({
                ...prev,
                batchId: result.batchId,
                batchRefId: result.batchRefId,
                farmerAddress: result.farmerAddress,
                quantity: result.initialQuantity, // Mengisi kuantitas dengan kuantitas awal
                unit: result.unit,
            }));

            // setIsScanning(false); // DIHAPUS

            toast({
                title: "Scan Berhasil!",
                description: `Batch ${result.batchId} terdeteksi (${result.initialQuantity} ${result.unit} tersedia). Harap verifikasi kuantitas & catatan.`,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat memindai.";
            toast({
                title: "Gagal Scan Produk",
                description: errorMessage,
                variant: "destructive",
            });
            setScannedData(null);
            // Kembali ke mode scan jika gagal (otomatis karena scannedData=null)
            setIsCameraModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * @description Handler saat QR code berhasil dipindai oleh komponen kamera.
     */
    const handleCameraScan = (scannedValue: string) => {
        setIsCameraModalOpen(false); // Tutup dialog kamera
        let finalBatchId = scannedValue;

        // Logika Parsing: Jika input adalah URL (ada karakter /)
        if (scannedValue.includes('/')) {
            try {
                // Mengambil bagian terakhir setelah karakter '/' terakhir
                const parts = scannedValue.split('/');
                finalBatchId = parts[parts.length - 1];

                console.log("Parsed Batch ID from URL:", finalBatchId);
            } catch (error) {
                console.error("Gagal memparsing URL QR:", error);
            }
        }

        // Jalankan pencarian data dengan ID yang sudah bersih (HRV-...)
        handleScanResult(finalBatchId);
    };

    /**
     * @description Mereset form dan kembali ke mode scan
     */
    const resetToScanMode = () => {
        setFormData(initialFormData);
        setScannedData(null); // Kunci: Ini yang mengembalikan ke tampilan Scanner
        // setIsScanning(true); // DIHAPUS
        setIsCameraModalOpen(false);
        // Panggil ulang GPS saat reset
        getGeolocation();
    };

    /**
     * @description Mengirim data pickup ke API untuk mencatat transaksi on-chain.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi Kunci (Tidak perlu cek manual input, karena scannedData harus ada)
        if (!scannedData || !formData.batchId || !formData.batchRefId || !formData.farmerAddress) {
            toast({
                title: "Aksi Tidak Valid",
                description: "Harap pindai (scan) kode produk terlebih dahulu untuk mendapatkan data Batch.",
                variant: "destructive",
            });
            return;
        }

        // Validasi GPS
        if (formData.gpsCoordinates.includes("tidak tersedia") || formData.gpsCoordinates.includes("Mengambil lokasi...")) {
            toast({
                title: "⚠️ Lokasi Belum Terambil",
                description: "Tunggu hingga koordinat GPS berhasil diambil atau ulangi pengambilan lokasi.",
                variant: "destructive",
            });
            return;
        }


        setIsSubmitting(true);

        const quantityNum = parseFloat(formData.quantity);
        if (quantityNum <= 0 || isNaN(quantityNum)) {
            toast({
                title: "Gagal Mencatat",
                description: "Kuantitas barang yang diambil wajib berupa angka positif.",
                variant: "destructive",
            });
            setIsSubmitting(false);
            return;
        }

        // Peringatan Kuantitas
        if (scannedData && parseFloat(scannedData.initialQuantity) > 0 && quantityNum > parseFloat(scannedData.initialQuantity)) {
            toast({
                title: "⚠️ Peringatan Kuantitas",
                description: `Kuantitas pickup (${quantityNum} ${formData.unit}) melebihi kuantitas awal batch (${scannedData.initialQuantity} ${scannedData.unit}). Harap verifikasi!`,
                variant: "destructive",
            });
        }


        try {
            const API_ENDPOINT = '/api/v1/logistic/pickup';

            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mencatat transaksi.');
            }

            const txHash = data.txHash || 'N/A';

            toast({
                title: "✅ Pickup Berhasil Dicatat",
                description: `Event PICKED (${formData.quantity} ${formData.unit}) untuk Batch ${formData.batchId} telah dicatat on-chain.`,
                action: (
                    <Button variant="link" onClick={() => window.open(`https://explorer.yourchain.com/tx/${txHash}`, '_blank')}>
                        Lihat Transaksi
                    </Button>
                ),
            });

            // Reset form dan kembali ke mode scan
            resetToScanMode();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Kesalahan Jaringan. Cek koneksi Anda.";
            toast({
                title: "⚠️ Gagal Transaksi",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <OperatorLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Truck className="w-8 h-8" /> Pencatatan Pickup
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Sebagai **LOGISTIK/OPERATOR**, catat pengambilan barang HANYA melalui QR Code.
                        </p>
                    </div>
                </div>

                {/* AREA SCANNER / FORM */}
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle>Data Pengambilan Barang (PICKED)</CardTitle>
                        <p className="text-sm text-muted-foreground">Langkah 1: Pindai (Scan) QR Code Produk. Langkah 2: Verifikasi detail kuantitas & catat.</p>
                    </CardHeader>
                    <CardContent>
                        {/* MODE SCANNING (Ketika scannedData=null) */}
                        {!scannedData ? (
                            <div className="space-y-4">
                                {/* TOMBOL UNTUK MEMBUKA MODAL KAMERA */}
                                <Button
                                    onClick={() => setIsCameraModalOpen(true)}
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    <Camera className="mr-2 h-4 w-4" /> Buka Kamera untuk Scan QR Code
                                </Button>

                                {/* TIDAK ADA OPSI INPUT MANUAL */}

                            </div>

                        ) : (
                            // MODE FORM INPUT (Setelah Scan Berhasil)
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Status Hasil Scan */}
                                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm flex flex-col gap-1">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <CheckCircle className="w-4 h-4" /> Data Produk Ditemukan
                                    </div>
                                    <p className="ml-6">
                                        **Batch ID:** {scannedData.batchId} <br />
                                        **Petani:** {scannedData.farmerName} <br />
                                        **Kuantitas Awal Tersedia:** {scannedData.initialQuantity} {scannedData.unit}
                                    </p>
                                </div>


                                {/* Batch ID (Disable karena sudah diisi dari scan) */}
                                <div className="space-y-2">
                                    <Label htmlFor="batchId">Batch ID Produk (Panen)</Label>
                                    <Input
                                        id="batchId"
                                        placeholder="Batch ID produk..."
                                        value={formData.batchId}
                                        onChange={handleChange}
                                        required
                                        disabled={true} // Selalu disabled setelah scan
                                        className="bg-gray-100 dark:bg-gray-700"
                                    />
                                </div>

                                {/* Farmer Address (Disable karena sudah diisi dari scan) */}
                                <div className="space-y-2">
                                    <Label htmlFor="farmerAddress">Alamat Aktor Petani (FARMER Address)</Label>
                                    <Input
                                        id="farmerAddress"
                                        placeholder="Alamat Wallet Petani..."
                                        value={formData.farmerAddress}
                                        onChange={handleChange}
                                        required
                                        disabled={true} // Selalu disabled setelah scan
                                        className="bg-gray-100 dark:bg-gray-700"
                                    />
                                </div>
                                {/* Hidden input untuk Batch Ref ID yang didapat dari scan */}
                                <input type="hidden" id="batchRefId" value={formData.batchRefId} />

                                {/* Quantity & Unit */}
                                <div className="flex space-x-4">
                                    <div className="space-y-2 flex-grow">
                                        <Label htmlFor="quantity">Kuantitas Diambil - **Verifikasi Nilai Ini**</Label>
                                        <Input
                                            id="quantity"
                                            type="text"
                                            placeholder="Masukkan Kuantitas"
                                            value={formData.quantity === "0" ? '' : formData.quantity}
                                            onChange={handleChange}
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                            Tersedia: {scannedData.initialQuantity} {scannedData.unit}. Ubah jika kuantitas pengambilan berbeda dari nilai yang disarankan.
                                        </p>
                                    </div>
                                    <div className="space-y-2 w-20">
                                        <Label htmlFor="unit">Unit</Label>
                                        <Input
                                            id="unit"
                                            type="text"
                                            value={formData.unit}
                                            onChange={handleChange}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>


                                {/* GPS Location (Bukti Lokasi) */}
                                <div className="space-y-2">
                                    <Label htmlFor="gpsCoordinates" className="flex items-center gap-1">
                                        {isGpsLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        ) : (
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        Koordinat GPS Pickup
                                    </Label>
                                    <Input
                                        id="gpsCoordinates"
                                        placeholder="Latitude, Longitude"
                                        value={formData.gpsCoordinates}
                                        onChange={handleChange}
                                        disabled={isSubmitting || isGpsLoading}
                                        className={isGpsLoading ? "text-primary italic" : (formData.gpsCoordinates.includes("tidak tersedia") ? "border-red-500" : "")}
                                    />
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={getGeolocation}
                                        className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                                        disabled={isGpsLoading || isSubmitting}
                                    >
                                        {isGpsLoading ? "Mencari Lokasi..." : "Ulangi Pengambilan Lokasi"}
                                    </Button>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Catatan Tambahan (Kualitas, Kondisi Truk, dll.)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Catatan verifikasi kondisi saat pickup..."
                                        value={formData.notes}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    // Validasi diubah: Hanya perlu cek formData.batchId karena formData diisi dari scan
                                    disabled={isSubmitting || !formData.batchId || isGpsLoading || formData.gpsCoordinates.includes("tidak tersedia")}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Mencatat Transaksi On-Chain...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Catat Pickup On-Chain
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={resetToScanMode}
                                    type="button"
                                    className="w-full text-sm text-muted-foreground"
                                    disabled={isSubmitting}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reset & Kembali ke Mode Scan
                                </Button>

                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Komponen Modal QRCameraScanner */}
            <QRCameraScanner
                isOpen={isCameraModalOpen}
                onClose={() => setIsCameraModalOpen(false)}
                onScan={handleCameraScan}
            />
        </OperatorLayout>
    )
}