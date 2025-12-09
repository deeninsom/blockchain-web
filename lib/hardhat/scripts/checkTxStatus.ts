// scripts/checkTxStatus.ts
import { ethers, Log } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// --- Setup untuk Environment Variables dan Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- Config dan Constants ---
const RPC_URL = process.env.RPC_URL as string || "http://127.0.0.1:8545";

// Ganti dengan hash transaksi yang sukses yang ingin Anda periksa
const TX_HASH = "0xdb99e1fb6dc8b82fb4086636af023f1ce5d470aec348d182320ac91641493589";

// --- Baca Artifact Kontrak Secara Manual ---
// Path ini harus sama dengan yang digunakan saat deploy
const artifactPath = path.resolve(__dirname, '../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json');
const ProductTraceabilityArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const CONTRACT_ABI = ProductTraceabilityArtifact.abi;


async function checkStatus() {
  if (!RPC_URL) {
    throw new Error("RPC_URL tidak diatur di .env.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Inisialisasi Contract Interface untuk decoding event
  const contractInterface = new ethers.Interface(CONTRACT_ABI);

  console.log(`\n🔍 Checking Transaction Status for Hash: ${TX_HASH}`);

  // 1. Dapatkan Transaction Receipt
  const receipt = await provider.getTransactionReceipt(TX_HASH);

  if (!receipt) {
    console.log(`Transaction with hash ${TX_HASH} not found or not mined yet.`);
    return;
  }

  console.log(`\n--- Transaction Receipt ---`);
  console.log(`Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILURE'}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Events (Logs) Emitted: ${receipt.logs.length}`);

  // 2. Decode Event Logs
  if (receipt.logs.length > 0) {
    console.log("\n--- Decoded ProductEvent Data ---");

    // Loop melalui semua log (asumsi log pertama adalah ProductEvent)
    for (const log of receipt.logs) {
      try {
        const parsedLog = contractInterface.parseLog(log);

        if (parsedLog && parsedLog.name === 'ProductEvent') {
          // Ekstrak data yang dibutuhkan
          const [batchIdBytes, actor, eventType, ipfsHash, timestamp] = parsedLog.args;

          // Konversi bytes32 kembali ke string
          const batchId = ethers.decodeBytes32String(batchIdBytes);

          console.log(`   Event Name: ${parsedLog.name}`);
          console.log(`   Batch ID (String): ${batchId}`);
          console.log(`   Actor Address: ${actor}`);
          console.log(`   Event Type (uint8): ${Number(eventType)}`);
          console.log(`   IPFS Hash: ${ipfsHash}`);
          console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
        }
      } catch (e) {
        // Log ini akan menangkap logs yang bukan merupakan ProductEvent (misal, logs dari Hardhat)
        // console.warn("Log is not a known event:", log); 
      }
    }
  }
  console.log("-----------------------------------------");
}

checkStatus().catch((err) => {
  console.error("Error during transaction status check:", err);
  process.exitCode = 1;
});