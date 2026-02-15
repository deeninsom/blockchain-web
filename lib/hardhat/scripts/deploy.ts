import { ethers, Wallet } from "ethers";
import * as dotenv from "dotenv";
import path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ================= INIT =================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const ETH_RPC = process.env.ETH_RPC as string;
const POLYGON_RPC = process.env.POLYGON_RPC as string;

if (!PRIVATE_KEY || !ETH_RPC || !POLYGON_RPC) {
  throw new Error("❌ ENV tidak lengkap. Cek PRIVATE_KEY, ETH_RPC, POLYGON_RPC");
}

// ================= LOAD ARTIFACT =================

const artifactPath = path.resolve(
  __dirname,
  "../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json"
);

if (!fs.existsSync(artifactPath)) {
  throw new Error("❌ Artifact tidak ditemukan. Jalankan: npx hardhat compile");
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const ABI = artifact.abi;
const BYTECODE = artifact.bytecode;

// ================= CHAIN MAP =================

const chainMap: Record<number, string> = {
  11155111: "Ethereum Sepolia",
  80002: "Polygon Amoy",
};

// ================= DEPLOY FUNCTION =================

async function deployToNetwork(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const signer = new Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(signer.address);

  console.log("==================================================");
  console.log("🌐 Network:", chainMap[chainId] ?? chainId);
  console.log("🔗 RPC:", rpcUrl);
  console.log("👤 Deployer:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance));

  if (balance === 0n) {
    throw new Error("❌ Saldo kosong! Isi faucet dulu.");
  }

  console.log("🚀 Deploying ProductTraceability...");

  const factory = new ethers.ContractFactory(ABI, BYTECODE, signer);
  const contract = await factory.deploy();

  const tx = contract.deploymentTransaction();
  if (!tx) throw new Error("Deployment transaction tidak ditemukan");

  console.log("⏳ Waiting confirmation...");
  const receipt = await tx.wait();

  const contractAddress = await contract.getAddress();

  console.log("--------------------------------------------------");
  console.log("✅ Deployment Success!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Transaction Hash:", receipt?.hash);
  console.log("==================================================\n");

  return { chainId, contractAddress };
}

// ================= MAIN =================

async function main() {
  console.log("🚀 Deploying to BOTH Sepolia & Polygon Amoy...\n");

  await deployToNetwork(ETH_RPC);
  await deployToNetwork(POLYGON_RPC);

  console.log("🎉 All deployments completed successfully.");
}

main().catch((err) => {
  console.error("❌ DEPLOYMENT FAILED:", err.message);
  process.exit(1);
});


// import { ethers, Wallet } from "ethers";
// import * as dotenv from 'dotenv';
// import path from 'path';
// import * as fs from 'fs';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({
//   path: path.resolve(__dirname, '../.env')
// });

// const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
// const RPC_URL = process.env.RPC_URL as string;
// const artifactPath = path.resolve(__dirname, '../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json');
// const ProductTraceabilityArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
// const CONTRACT_ABI = ProductTraceabilityArtifact.abi;
// const CONTRACT_BYTECODE = ProductTraceabilityArtifact.bytecode;


// async function main() {
//   if (!PRIVATE_KEY || !RPC_URL) {
//     throw new Error("PRIVATE_KEY atau RPC_URL tidak diatur di .env.");
//   }

//   // 1. Inisialisasi Ethers Provider dan Signer (Wallet)
//   const provider = new ethers.JsonRpcProvider(RPC_URL);
//   const signer = new Wallet(PRIVATE_KEY, provider);

//   // 2. Buat Factory Ethers Native
//   const Factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, signer);

//   console.log("🚀 Deploying ProductTraceability contract via Ethers native...");

//   // 3. Deployment (Mengirim Transaksi)
//   const contract = await Factory.deploy();

//   // Ambil objek Transaction Response untuk mendapatkan hash dan menunggu receipt
//   const deploymentTx = contract.deploymentTransaction();
//   if (!deploymentTx) {
//     throw new Error("Could not retrieve deployment transaction response.");
//   }

//   // 4. Tunggu hingga deployment selesai dan dapatkan Receipt
//   const receipt = await deploymentTx.wait();

//   if (!receipt) {
//     throw new Error("Deployment failed, receipt not found.");
//   }

//   const contractAddress = await contract.getAddress();
//   const txHash = receipt.hash; // ✅ Hash berhasil diambil dari Receipt

//   console.log("----------------------------------------------------------------");
//   console.log(`✅ ProductTraceability deployed successfully!`);
//   console.log(`📝 Contract Address: ${contractAddress}`);
//   console.log(`🔗 Transaction Hash: ${txHash}`);
//   console.log("----------------------------------------------------------------");
// }

// main().catch((err) => {
//   console.error("DEPLOYMENT FAILED:", err);
//   process.exitCode = 1;
// });