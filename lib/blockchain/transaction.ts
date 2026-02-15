import { ethers, Contract } from "ethers";
import { abi } from "../hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json";

interface TxResult {
  network: string;
  txHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  logIndex: number;
}

export async function sendToBothNetworks(
  expectedActorAddress: string,
  batchId: string,
  ipfsHash: string,
  eventType: number
): Promise<TxResult[]> {

  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const SEPOLIA_RPC = process.env.SEPOLIA_RPC;
  const AMOY_RPC = process.env.AMOY_RPC;
  const SEPOLIA_CONTRACT = process.env.SEPOLIA_CONTRACT;
  const AMOY_CONTRACT = process.env.AMOY_CONTRACT;

  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing");
  if (!SEPOLIA_RPC || !AMOY_RPC) throw new Error("RPC missing");
  if (!SEPOLIA_CONTRACT || !AMOY_CONTRACT) throw new Error("Contract address missing");

  const networks = [
    {
      name: "Ethereum Sepolia",
      rpc: SEPOLIA_RPC,
      contract: SEPOLIA_CONTRACT
    },
    {
      name: "Polygon Amoy",
      rpc: AMOY_RPC,
      contract: AMOY_CONTRACT
    }
  ];

  const results: TxResult[] = [];

  for (const net of networks) {

    console.log(`\n==============================`);
    console.log(`🌐 Sending to ${net.name}`);
    console.log(`==============================`);

    try {

      const provider = new ethers.JsonRpcProvider(net.rpc);
      const signer = new ethers.Wallet(PRIVATE_KEY, provider);

      console.log(`Signer: ${signer.address}`);

      const balanceBigInt = await provider.getBalance(signer.address);
      const balance = ethers.formatEther(balanceBigInt);

      console.log(`Balance: ${balance}`);

      if (Number(balance) <= 0) {
        throw new Error(`Saldo kosong di ${net.name}`);
      }

      const contract = new Contract(net.contract, abi, signer);
      const batchIdBytes = ethers.encodeBytes32String(batchId);

      console.log("⏳ Sending transaction...");

      const tx = await contract.recordEvent(
        batchIdBytes,
        expectedActorAddress,
        eventType,
        ipfsHash
      );

      console.log(`TX Hash: ${tx.hash}`);
      console.log("⏳ Waiting confirmation...");

      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction failed on ${net.name}`);
      }

      const block = await provider.getBlock(receipt.blockNumber);

      const result: TxResult = {
        network: net.name,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockTimestamp: new Date(Number(block!.timestamp) * 1000),
        logIndex: receipt.logs?.[0]?.index ?? 0
      };

      console.log(`✅ SUCCESS on ${net.name}`);
      console.log(`Block: ${result.blockNumber}`);
      console.log(`Time: ${result.blockTimestamp.toISOString()}`);

      results.push(result);

    } catch (error: any) {
      console.error(`❌ FAILED on ${net.name}`);
      console.error(error.message);
    }
  }

  console.log("\n🎉 PROCESS FINISHED");
  return results;
}

