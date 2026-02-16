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
const BESU_RPC = process.env.BESU_RPC as string;

if (!PRIVATE_KEY || !ETH_RPC || !POLYGON_RPC || !BESU_RPC) {
  throw new Error("❌ ENV tidak lengkap. Cek PRIVATE_KEY, ETH_RPC, POLYGON_RPC, BESU_RPC");
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
  1337: "Besu Local Dev",
};

// ================= FUND BESU IF NEEDED =================

async function fundBesuIfNeeded(provider: ethers.JsonRpcProvider, deployerAddress: string) {
  const balance = await provider.getBalance(deployerAddress);
  if (balance > 0n) return; // cukup saldo, tidak perlu funding

  console.log("💸 Saldo Besu kosong. Funding deployer 10 ETH dari account pertama Besu...");
  const signer0 = await provider.getSigner(0); // ✅ tambahkan await
  const tx = await signer0.sendTransaction({
    to: deployerAddress,
    value: ethers.parseEther("10"),
  });
  await tx.wait();
  console.log("✅ Deployer funded!");
}


// ================= DEPLOY FUNCTION =================

async function deployToNetwork(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const signer = new Wallet(PRIVATE_KEY, provider);
  let balance = await provider.getBalance(signer.address);

  console.log("==================================================");
  console.log("🌐 Network:", chainMap[chainId] ?? chainId);
  console.log("🔗 RPC:", rpcUrl);
  console.log("👤 Deployer:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance));

  // Hanya funding otomatis untuk Besu
  if (chainId === 1337 && balance === 0n) {
    await fundBesuIfNeeded(provider, signer.address);
    balance = await provider.getBalance(signer.address);
    console.log("💰 New Balance:", ethers.formatEther(balance));
  }

  if (balance === 0n) {
    throw new Error("❌ Saldo masih kosong! Isi faucet dulu.");
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
  console.log("🚀 Deploying to BOTH Sepolia & Polygon Amoy && Besu...\n");

  await deployToNetwork(ETH_RPC);
  await deployToNetwork(POLYGON_RPC);
  await deployToNetwork(BESU_RPC);

  console.log("🎉 All deployments completed successfully.");
}

main().catch((err) => {
  console.error("❌ DEPLOYMENT FAILED:", err.message);
  process.exit(1);
});


// import { ethers, Wallet } from "ethers";
// import * as dotenv from "dotenv";
// import path from "path";
// import * as fs from "fs";
// import { fileURLToPath } from "url";

// // ================= INIT =================

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config({
//   path: path.resolve(__dirname, "../.env"),
// });

// const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
// const ETH_RPC = process.env.ETH_RPC as string;
// const POLYGON_RPC = process.env.POLYGON_RPC as string;
// const BESU_RPC = process.env.BESU_RPC as string;

// if (!PRIVATE_KEY || !ETH_RPC || !POLYGON_RPC || !BESU_RPC) {
//   throw new Error("❌ ENV tidak lengkap. Cek PRIVATE_KEY, ETH_RPC, POLYGON_RPC");
// }

// // ================= LOAD ARTIFACT =================

// const artifactPath = path.resolve(
//   __dirname,
//   "../artifacts/contracts/ProductTraceability.sol/ProductTraceability.json"
// );

// if (!fs.existsSync(artifactPath)) {
//   throw new Error("❌ Artifact tidak ditemukan. Jalankan: npx hardhat compile");
// }

// const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
// const ABI = artifact.abi;
// const BYTECODE = artifact.bytecode;

// // ================= CHAIN MAP =================

// const chainMap: Record<number, string> = {
//   11155111: "Ethereum Sepolia",
//   80002: "Polygon Amoy",
//   1337: "Besu Local Dev",
// };

// // ================= DEPLOY FUNCTION =================

// async function deployToNetwork(rpcUrl: string) {
//   const provider = new ethers.JsonRpcProvider(rpcUrl);
//   const network = await provider.getNetwork();
//   const chainId = Number(network.chainId);

//   const signer = new Wallet(PRIVATE_KEY, provider);
//   const balance = await provider.getBalance(signer.address);

//   console.log("==================================================");
//   console.log("🌐 Network:", chainMap[chainId] ?? chainId);
//   console.log("🔗 RPC:", rpcUrl);
//   console.log("👤 Deployer:", signer.address);
//   console.log("💰 Balance:", ethers.formatEther(balance));

//   console.log("⏳ Checking balance...", balance)
//   if (balance === 0n) {
//     throw new Error("❌ Saldo kosong! Isi faucet dulu.");
//   }

//   console.log("🚀 Deploying ProductTraceability...");

//   const factory = new ethers.ContractFactory(ABI, BYTECODE, signer);
//   const contract = await factory.deploy();

//   const tx = contract.deploymentTransaction();
//   if (!tx) throw new Error("Deployment transaction tidak ditemukan");

//   console.log("⏳ Waiting confirmation...");
//   const receipt = await tx.wait();

//   const contractAddress = await contract.getAddress();

//   console.log("--------------------------------------------------");
//   console.log("✅ Deployment Success!");
//   console.log("📍 Contract Address:", contractAddress);
//   console.log("🔗 Transaction Hash:", receipt?.hash);
//   console.log("==================================================\n");

//   return { chainId, contractAddress };
// }

// // ================= MAIN =================

// async function main() {
//   console.log("🚀 Deploying to BOTH Sepolia & Polygon Amoy && Besu...\n");

//   await deployToNetwork(ETH_RPC);
//   await deployToNetwork(POLYGON_RPC);
//   await deployToNetwork(BESU_RPC);

//   console.log("🎉 All deployments completed successfully.");
// }

// main().catch((err) => {
//   console.error("❌ DEPLOYMENT FAILED:", err.message);
//   process.exit(1);
// });

