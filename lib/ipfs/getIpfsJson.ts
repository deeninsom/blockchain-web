// import { jsonResponse } from "../json"; // Di-komen karena tidak digunakan dalam potongan kode ini

// Ambil URL Gateway dari environment variable. 
// Pastikan variabel ini disetel dengan benar, misal: "https://ipfs.io"
const IPFS_GATEWAY_BASE_URL = process.env.IPFS_GATEWAY_URL;

/**
 * Mengambil dan mem-parse data JSON dari hash IPFS (CID) yang diberikan.
 * * @param ipfsHash Hash IPFS (CID) dari file JSON.
 * @returns Promise yang resolve dengan objek data JSON yang telah diparse, atau objek kosong ({}) jika gagal.
 * @throws Error jika proses fetch gagal atau respons status tidak OK.
 */
export async function getIpfsJson(ipfsHash: string): Promise<any> {
  if (!ipfsHash) {
    console.warn("getIpfsJson dipanggil tanpa hash.");
    return {};
  }

  if (!IPFS_GATEWAY_BASE_URL) {
    console.error("IPFS_GATEWAY_URL tidak disetel di environment variables.");
    return {};
  }

  // Membersihkan dan memastikan URL base gateway
  const gatewayBaseUrl = IPFS_GATEWAY_BASE_URL.endsWith('/')
    ? IPFS_GATEWAY_BASE_URL.slice(0, -1)
    : IPFS_GATEWAY_BASE_URL;

  // Konstruksi URL yang benar: BASE_URL + /ipfs/ + HASH
  // Contoh: https://ipfs.io/ipfs/Qm...
  const url = `${gatewayBaseUrl}/ipfs/${ipfsHash}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Tambahkan headers otorisasi jika gateway Anda membutuhkannya
      },
    });

    console.log(`[IPFS] Mencoba URL: ${url}`);

    // ⚠️ Periksa apakah respons HTTP sukses (status 200-299)
    if (!response.ok) {
      const errorBody = await response.text();
      // Throw error dengan status dan body untuk debugging yang lebih mudah
      throw new Error(`Gagal mengambil data dari IPFS Gateway. Status: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 100)}...`);
    }

    // Parse data JSON
    const data = await response.json();
    console.log(`[IPFS] Data berhasil diambil untuk hash ${ipfsHash}`);
    return data;

  } catch (error) {
    // Tangani semua error: jaringan (ENOTFOUND), parsing JSON, atau respons non-OK
    const errorMessage = error instanceof Error ? error.message : "Error tidak diketahui";
    console.error(`[IPFS] Error saat fetching hash ${ipfsHash} dari URL ${url}: ${errorMessage}`, error);

    // Kembalikan objek kosong sebagai default failure state
    return {};
  }
}