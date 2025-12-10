"use client"

import { useState } from "react"
import { OperatorLayout } from "@/components/operator/operator-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Truck, MapPin, CheckCircle, QrCode, Camera } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"

// --- Import Komponen Kamera Anda (Dianggap berada di folder yang sama atau di components) ---
import { QRCameraScanner } from "@/components/qr-camera-scanner"
// --- Tipe Data Disesuaikan (Mengikuti API Backend) ---

interface PickupFormData {
    batchId: string;
    batchRefId: string; // Diperlukan untuk POST API (UUID internal)
    farmerAddress: string;
    quantity: string;  // Quantity sebagai STRING
    unit: string;      // Unit wajib ada
    gpsCoordinates: string;
    notes: string;
}

// Data hasil get API (sesuai respons dari /api/v1/logistic/[batchId])
interface ScannedProductData {
    batchId: string;
    batchRefId: string;
    farmerAddress: string;
    farmerName: string;
    initialQuantity: string; // Quantity tersedia sebagai STRING
    unit: string;
    status: string;
}

// --- Komponen Utama ---

export default function PickupPage() {
    const { toast } = useToast();
    const [isScanning, setIsScanning] = useState(true); // True = mode scan, False = mode form
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false); // Mengontrol dialog kamera
    const [scannedData, setScannedData] = useState<ScannedProductData | null>(null);

    const initialFormData: PickupFormData = {
        batchId: "",
        batchRefId: "",
        farmerAddress: "",
        quantity: "0",
        unit: "kg",
        gpsCoordinates: "-6.201, 106.812", // Default/Mock GPS
        notes: "",
    };

    const [formData, setFormData] = useState<PickupFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Simulasi Batch ID untuk testing
    const MOCK_SCAN_BATCH_ID = "PN-LOKAL-0072A";

    // Handler perubahan form
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;

        // Khusus kuantitas, pastikan formatnya string angka (memungkinkan titik desimal)
        const newValue = id === 'quantity' && value.match(/^[0-9]*\.?[0-9]*$/) ? value : value;

        setFormData(prev => ({
            ...prev,
            [id]: newValue,
        }));
    };

    /**
     * @description Mengambil data batch dari API setelah scan. Dipanggil dari QRCameraScanner atau simulasi.
     */
    const handleScanResult = async (scannedBatchId: string) => {
        // Abaikan jika Batch ID yang sama baru saja diproses
        if (scannedBatchId === formData.batchId && scannedData !== null) return;

        setIsSubmitting(true);
        setIsCameraModalOpen(false); // Pastikan modal tertutup setelah hasil diterima

        try {
            // >>> PEMANGGILAN API GET NYATA <<<
            // Ganti ini dengan endpoint API Anda yang sebenarnya
            const res = await fetch(`/api/v1/logistic/${scannedBatchId}`);
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
                quantity: result.initialQuantity,
                unit: result.unit,
            }));

            setIsScanning(false); // Pindah ke mode form

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
            // Kembali ke mode scan jika gagal
            setIsScanning(true);
            setIsCameraModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * @description Handler saat QR code berhasil dipindai oleh komponen kamera.
     */
    const handleCameraScan = (scannedBatchId: string) => {
        setIsCameraModalOpen(false); // Tutup dialog kamera
        handleScanResult(scannedBatchId);
    };

    // Fungsi simulasi scan (dipertahankan untuk testing)
    const simulateScan = () => {
        handleScanResult(MOCK_SCAN_BATCH_ID);
    };

    /**
     * @description Mereset form dan kembali ke mode scan
     */
    const resetToScanMode = () => {
        setFormData(initialFormData);
        setScannedData(null);
        setIsScanning(true);
        setIsCameraModalOpen(false);
    };

    /**
     * @description Mengirim data pickup ke API untuk mencatat transaksi on-chain.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.batchId || !formData.batchRefId || !formData.farmerAddress) {
            toast({
                title: "Aksi Tidak Valid",
                description: "Harap pindai (scan) kode produk terlebih dahulu.",
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

        if (scannedData && parseFloat(scannedData.initialQuantity) > 0 && quantityNum > parseFloat(scannedData.initialQuantity)) {
            toast({
                title: "⚠️ Peringatan Kuantitas",
                description: `Kuantitas pickup (${quantityNum} ${formData.unit}) melebihi kuantitas awal batch (${scannedData.initialQuantity} ${scannedData.unit}). Harap verifikasi!`,
                variant: "destructive",
            });
            // Tidak menghentikan submission, hanya memberikan peringatan
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
                            <Truck className="w-8 h-8" /> Pencatatan Pickup Petani
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Sebagai **LOGISTIK/OPERATOR**, catat pengambilan barang dari gudang Petani.
                        </p>
                    </div>
                </div>

                {/* AREA SCANNER / FORM */}
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle>Data Pengambilan Barang (PICKED)</CardTitle>
                        <p className="text-sm text-muted-foreground">Langkah 1: Pindai (Scan) Produk. Langkah 2: Verifikasi detail kuantitas.</p>
                    </CardHeader>
                    <CardContent>
                        {/* MODE SCANNING (Ketika isScanning=true) */}
                        {isScanning ? (
                            <div className="space-y-4">

                                {/* 💡 TOMBOL UNTUK MEMBUKA MODAL KAMERA */}
                                <Button
                                    onClick={() => setIsCameraModalOpen(true)}
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    <Camera className="mr-2 h-4 w-4" /> Buka Kamera untuk Scan
                                </Button>

                                {/* Tombol Simulasikan Scan */}
                                <Button
                                    onClick={simulateScan}
                                    className="w-full"
                                    disabled={isSubmitting}
                                    variant="secondary"
                                >
                                    <QrCode className="mr-2 h-4 w-4" /> Simulasikan Scan ({MOCK_SCAN_BATCH_ID})
                                </Button>

                                {/* Tombol Input Manual */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setScannedData(null);
                                        setIsScanning(false); // Pindah ke mode form
                                        setFormData(initialFormData);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Input Manual Batch ID
                                </Button>
                            </div>

                        ) : (
                            // MODE FORM INPUT (Setelah Scan atau Manual Input)
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Status Hasil Scan */}
                                {scannedData && (
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
                                )}

                                {!scannedData && formData.batchId && (
                                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                                        Anda berada dalam mode **Input Manual**. Harap isi semua detail dengan benar.
                                    </div>
                                )}


                                {/* Batch ID */}
                                <div className="space-y-2">
                                    <Label htmlFor="batchId">Batch ID Produk (Panen)</Label>
                                    <Input
                                        id="batchId"
                                        placeholder="Masukkan Batch ID"
                                        value={formData.batchId}
                                        onChange={handleChange}
                                        required
                                        disabled={isSubmitting || scannedData !== null}
                                        className={scannedData ? "bg-gray-100 dark:bg-gray-700" : ""}
                                    />
                                </div>

                                {/* Farmer Address (Disable jika sudah terisi dari scan) */}
                                <div className="space-y-2">
                                    <Label htmlFor="farmerAddress">Alamat Aktor Petani (FARMER Address)</Label>
                                    <Input
                                        id="farmerAddress"
                                        placeholder="Alamat Wallet Petani"
                                        value={formData.farmerAddress}
                                        onChange={handleChange}
                                        required
                                        disabled={isSubmitting || scannedData !== null}
                                        className={scannedData ? "bg-gray-100 dark:bg-gray-700" : ""}
                                    />
                                    {/* Hidden field untuk BatchRefID */}
                                    <input type="hidden" id="batchRefId" value={formData.batchRefId} />
                                </div>

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
                                        {scannedData && (
                                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                                Tersedia: {scannedData.initialQuantity} {scannedData.unit}. Ubah jika kuantitas pengambilan berbeda.
                                            </p>
                                        )}
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
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                        Koordinat GPS Pickup
                                    </Label>
                                    <Input
                                        id="gpsCoordinates"
                                        placeholder="-6.175, 106.827 (Otomatis dari GPS perangkat)"
                                        value={formData.gpsCoordinates}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                    />
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
                                    disabled={isSubmitting || !formData.batchId || !formData.batchRefId}
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
                                >
                                    Batalkan & Scan Produk Lain
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
                onScan={handleCameraScan} // Mengirim hasil scan kembali ke fungsi handleScanResult
            />
        </OperatorLayout>
    )
}