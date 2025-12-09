// scripts/deploy.ts (Koreksi Final)
import { ethers, Wallet } from "ethers";
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// --- Mengganti __dirname di ES Module ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------------------

// Asumsi file .env berada di root folder hardhat (../)
// Jika Anda menjalankan ini dari root folder Hardhat, path ini seharusnya benar.
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
// KOREKSI: Menggunakan RPC_URL sesuai dengan file .env Anda
const RPC_URL = process.env.RPC_URL as string;

// --- Baca Artifact Kontrak Secara Manual ---
// Path ini diasumsikan relatif terhadap folder Hardhat root: ../artifacts/
const artifactPath = path.resolve(__dirname, '../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json');
const ProductTraceabilityArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const CONTRACT_ABI = ProductTraceabilityArtifact.abi;
const CONTRACT_BYTECODE = ProductTraceabilityArtifact.bytecode;


async function main() {
  if (!PRIVATE_KEY || !RPC_URL) {
    throw new Error("PRIVATE_KEY atau RPC_URL tidak diatur di .env.");
  }

  // 1. Inisialisasi Ethers Provider dan Signer (Wallet)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new Wallet(PRIVATE_KEY, provider);

  // 2. Buat Factory Ethers Native
  const Factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);

  console.log("🚀 Deploying ProductTraceability contract via Ethers native...");

  // 3. Deployment (Mengirim Transaksi)
  const contract = await Factory.deploy();

  // --- KOREKSI KRITIS DI SINI ---
  // Ambil objek Transaction Response untuk mendapatkan hash dan menunggu receipt
  const deploymentTx = contract.deploymentTransaction();
  if (!deploymentTx) {
    throw new Error("Could not retrieve deployment transaction response.");
  }

  // 4. Tunggu hingga deployment selesai dan dapatkan Receipt
  const receipt = await deploymentTx.wait();

  if (!receipt) {
    throw new Error("Deployment failed, receipt not found.");
  }

  const contractAddress = await contract.getAddress();
  const txHash = receipt.hash; // ✅ Hash berhasil diambil dari Receipt

  console.log("----------------------------------------------------------------");
  console.log(`✅ ProductTraceability deployed successfully!`);
  console.log(`📝 Contract Address: ${contractAddress}`);
  console.log(`🔗 Transaction Hash: ${txHash}`);
  console.log("----------------------------------------------------------------");
}

main().catch((err) => {
  console.error("DEPLOYMENT FAILED:", err);
  process.exitCode = 1;
});