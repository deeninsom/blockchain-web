// scripts/deploy.ts (Deployment Ethers v6 Native - KOREKSI FINAL)
import { ethers, Wallet } from "ethers";
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url'; // <<< IMPORT BARU

// --- Mengganti __dirname di ES Module ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------------------

// Setup environment variables (Asumsi file .env berada dua level di atas scripts)
// Path yang dikoreksi: C:\Users\LENOVO\dev\blockchain\blockchain-web\lib\hardhat\scripts\deploy.ts
// Path Target: C:\Users\LENOVO\dev\blockchain\blockchain-web\lib\hardhat\.env
dotenv.config({
  path: path.resolve(__dirname, '../.env') // Sesuaikan path .env jika perlu
});

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const RPC_URL = process.env.NETWORK_RPC_URL as string; // http://127.0.0.1:8545

// --- Baca Artifact Kontrak Secara Manual ---
// Path ini mungkin perlu disesuaikan tergantung struktur folder Anda
const artifactPath = path.resolve(__dirname, '../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json');
const ProductTraceabilityArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const CONTRACT_ABI = ProductTraceabilityArtifact.abi;
const CONTRACT_BYTECODE = ProductTraceabilityArtifact.bytecode;


async function main() {
  if (!PRIVATE_KEY || !RPC_URL) {
    throw new Error("PRIVATE_KEY atau NETWORK_RPC_URL tidak diatur di .env.");
  }

  // 1. Inisialisasi Ethers Provider dan Signer (Wallet)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new Wallet(PRIVATE_KEY, provider);

  // 2. Buat Factory Ethers Native
  const Factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);

  console.log("Deploying ProductTraceability contract via Ethers native...");

  // 3. Deployment
  const contract = await Factory.deploy();

  // 4. Tunggu hingga deployment selesai
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("----------------------------------------------------------------");
  console.log(`✅ ProductTraceability deployed successfully!`);
  console.log(`📝 Contract Address: ${contractAddress}`);
  console.log("----------------------------------------------------------------");
  console.log(`PASTIKAN Anda menyalin alamat ini dan menyimpannya di variabel:`);
  console.log(`SMART_CONTRACT_ADDRESS di file .env Backend/Listener Anda.`);
}

main().catch((err) => {
  console.error("DEPLOYMENT FAILED:", err);
  process.exitCode = 1;
});