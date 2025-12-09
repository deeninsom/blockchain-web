// src/lib/blockchain/decoder.ts
import { ethers } from 'ethers';
// 🛑 Import ABI secara statis dari path Hardhat artifacts
import { abi as CONTRACT_ABI } from '../hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json';

/* -------------------------------------------------------------------------- */
/* UTILITIES: DATA LOOKUP (Menggunakan Panggilan API: /api/v1/users)          */
/* -------------------------------------------------------------------------- */

// FUNGSI UTAMA: Mengambil nama aktor dari database (melalui API publik/list)
async function getActorNameByAddress(address: string): Promise<string> {
  // 🛑 KOREKSI: Gunakan base URL yang lebih aman untuk server-side fetch
  // Gunakan NEXT_PUBLIC_APP_URL jika tersedia, atau fallback ke localhost
  const BASE_URL = process.env.NEXT_PUBLIC_URL
  const LOOKUP_URL = `${BASE_URL}api/v1/users?address=${address}`;

  try {
    const res = await fetch(LOOKUP_URL);
    const p = await res.json();

    console.log(p)
    // Fallback jika fetch berhasil tapi status bukan 200 (misal 404) atau user data kosong
    return `Aktor ${p?.name}`;

  } catch (error) {
    // Fallback jika terjadi error pada saat fetch (misal: network error)
    console.error(`Error fetching user data from ${LOOKUP_URL}:`, error);
    return `Aktor (${address.substring(0, 6)}...)`;
  }
}

// FUNGSI UNTUK MAPPING EVENT TYPE
function getEventNameByType(eventType: number): string {
  const mapping: { [key: number]: string } = {
    1: 'Harvest',
    2: 'Shipment',
    3: 'Received',
    4: 'Processing',
  };
  return mapping[eventType] || `Event Code ${eventType}`;
}


/* -------------------------------------------------------------------------- */
/* INTERFACES & DECODING LOGIC                                                */
/* -------------------------------------------------------------------------- */

export interface DecodedTxData {
  status: 'VERIFIED' | 'FAILURE' | 'PENDING';
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  eventsEmitted: number;
  decodedEvent: {
    eventName: string;
    batchId: string;
    actorAddress: string;
    actorName: string;
    eventType: number;
    ipfsHash: string;
    timestamp: string;
  } | null;
}

const contractInterface = new ethers.Interface(CONTRACT_ABI);

/**
 * Mengambil dan mendecode status dan event log dari hash transaksi.
 * @param txHash Hash transaksi yang akan diperiksa.
 * @returns Objek DecodedTxData.
 */
export async function getDecodedTxData(txHash: string): Promise<DecodedTxData> {
  const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return {
      status: 'PENDING',
      txHash,
      blockNumber: 0,
      gasUsed: '0',
      eventsEmitted: 0,
      decodedEvent: null
    };
  }
  // console.log('receipt', receipt)
  const txStatus = receipt.status === 1 ? 'VERIFIED' : 'FAILURE';

  let decodedEventData = null;

  // Decode Event Logs
  for (const log of receipt.logs) {
    try {
      const parsedLog = contractInterface.parseLog(log);

      if (parsedLog && parsedLog.name === 'ProductEvent') {
        const [batchIdBytes, address, eventType, ipfsHash, timestamp] = parsedLog.args;
        // console.log('parsedLog.args', parsedLog.args)
        // Lookup nama aktor (memanggil fungsi yang fetch list pengguna)
        const readableEventName = getEventNameByType(Number(eventType));

        // Membersihkan string dari padding null characters
        const cleanedBatchId = ethers.decodeBytes32String(batchIdBytes).replace(/\0.*$/g, '');
        const actorName = await getActorNameByAddress(address);
        console.log('cok', actorName)
        decodedEventData = {
          eventName: `${parsedLog.name} (${readableEventName})`,
          batchId: cleanedBatchId,
          actorAddress: address,
          actorName: actorName,
          eventType: Number(eventType),
          ipfsHash: ipfsHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        };
        break;
      }
    } catch (e) {
      // Abaikan log yang tidak dikenal
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