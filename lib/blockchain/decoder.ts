// src/lib/blockchain/decoder.ts
import { ethers } from 'ethers';
// 🛑 Import ABI secara statis dari path Hardhat artifacts
import { abi as CONTRACT_ABI } from '../hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json';

/* -------------------------------------------------------------------------- */
/* UTILITIES: IPFS FETCHER (Implementasi dari input Anda)                     */
/* -------------------------------------------------------------------------- */

// Ambil URL Gateway dari environment variable.
const IPFS_GATEWAY_BASE_URL = process.env.IPFS_GATEWAY_URL;

/**
 * Mengambil dan mem-parse data JSON dari hash IPFS (CID) yang diberikan.
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

  const gatewayBaseUrl = IPFS_GATEWAY_BASE_URL.endsWith('/')
    ? IPFS_GATEWAY_BASE_URL.slice(0, -1)
    : IPFS_GATEWAY_BASE_URL;

  const url = `${gatewayBaseUrl}/ipfs/${ipfsHash}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`[IPFS] Mencoba URL: ${url}`);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gagal mengambil data dari IPFS Gateway. Status: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 100)}...`);
    }

    const data = await response.json();
    console.log(`[IPFS] Data berhasil diambil untuk hash ${ipfsHash}`);
    return data;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error tidak diketahui";
    console.error(`[IPFS] Error saat fetching hash ${ipfsHash} dari URL ${url}: ${errorMessage}`, error);

    return {};
  }
}


/* -------------------------------------------------------------------------- */
/* UTILITIES: ACTOR LOOKUP & MAPPING                                          */
/* -------------------------------------------------------------------------- */

// PERBAIKAN: Mengambil nama aktor dari database (melalui API publik/list)
async function getActorNameByAddress(address: string): Promise<string> {
  const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const finalBaseUrl = BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/';
  const LOOKUP_URL = `${finalBaseUrl}api/v1/users?address=${address}`;

  try {
    const res = await fetch(LOOKUP_URL, {
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();

    if (res.ok && json.success && json.data?.name) {
      return json.data.name;
    }

    return `Unknown Actor (${address.substring(0, 6)}...)`;

  } catch (error) {
    console.error(`Error fetching user data from ${LOOKUP_URL}:`, error);
    return `Network Error Actor (${address.substring(0, 6)}...)`;
  }
}

// FUNGSI UNTUK MAPPING EVENT TYPE
function getEventNameByType(eventType: number): string {
  const mapping: { [key: number]: string } = {
    1: 'Harvest',
    2: 'Shipment',
    3: 'Received',
    4: 'Processing',
    // Tambahkan 5: 'Shipment Received' jika perlu
  };
  return mapping[eventType] || `Event Code ${eventType}`;
}


/* -------------------------------------------------------------------------- */
/* INTERFACES & DECODING LOGIC (UTAMA)                                      */
/* -------------------------------------------------------------------------- */

export interface DecodedTxData {
  status: 'VERIFIED' | 'FAILURE' | 'PENDING';
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  eventsEmitted: number;
  // PERUBAHAN: Menambahkan ipfsData ke decodedEvent
  decodedEvent: {
    eventName: string;
    batchId: string;
    actorAddress: string;
    actorName: string;
    eventType: number;
    ipfsHash: string;
    timestamp: string;
    ipfsData: any; // <-- DATA IPFS DARI getIpfsJson
  } | null;
}

const contractInterface = new ethers.Interface(CONTRACT_ABI);

/**
 * Mengambil, mendekode, dan melengkapi data event dari IPFS.
 */
export async function getDecodedTxData(txHash: string): Promise<DecodedTxData> {
  const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return { status: 'PENDING', txHash, blockNumber: 0, gasUsed: '0', eventsEmitted: 0, decodedEvent: null };
  }

  const txStatus = receipt.status === 1 ? 'VERIFIED' : 'FAILURE';
  let decodedEventData = null;

  for (const log of receipt.logs) {
    try {
      const parsedLog = contractInterface.parseLog(log);

      if (parsedLog && parsedLog.name === 'ProductEvent') {

        const [batchIdBytes, address, eventType, ipfsHash, timestamp] = parsedLog.args;

        const readableEventName = getEventNameByType(Number(eventType));
        const cleanedBatchId = ethers.decodeBytes32String(batchIdBytes).replace(/\0.*$/g, '');

        // Panggil utilitas yang ada di atas
        const actorName = await getActorNameByAddress(address);
        const ipfsJsonData = await getIpfsJson(ipfsHash); // <--- INTEGRASI IPFS

        decodedEventData = {
          eventName: `ProductEvent (${readableEventName})`,
          batchId: cleanedBatchId,
          actorAddress: address,
          actorName: actorName,
          eventType: Number(eventType),
          ipfsHash: ipfsHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
          ipfsData: ipfsJsonData, // <-- DATA IPFS
        };
        break;
      }
    } catch (e) {
      // Error ini mungkin terjadi jika log bukan dari kontrak ProductTraceability
      console.error("Error saat mendekode log:", e);
    }
  }

  return {
    status: txStatus,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    eventsEmitted: receipt.logs.length,
    decodedEvent: decodedEventData,
  };
}