import "dotenv/config";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma"; // pastikan path benar

const WS_NODE_URL = process.env.WS_NODE_URL!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
import MyContractABI from "@/lib/hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json"; // sesuaikan path

const provider = new ethers.WebSocketProvider(WS_NODE_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, MyContractABI.abi, provider);

interface ProductEventOnChain {
  batchBytes32: string | Uint8Array;
  actor: string;
  eventType: number;
  ipfsHash: string;
  timestamp: bigint;
  event: {
    blockNumber: number;
    transactionHash: string;
    logIndex?: number;
  };
}

async function findBatchIdFromBytes32(bytes32: string) {
  const allBatches = await prisma.batch.findMany({ select: { id: true, batchId: true } });
  return allBatches.find((b) => ethers.id(b.batchId) === bytes32) ?? null;
}

async function startListener() {
  console.log("🚀 Starting ProductEvent listener...");

  contract.on(
    "ProductEvent",
    async (batchBytes32, actor, eventType, ipfsHash, timestamp, event) => {
      try {
        const batchHex = typeof batchBytes32 === "string" ? batchBytes32 : ethers.hexlify(batchBytes32);
        const match = await findBatchIdFromBytes32(batchHex);
        const batchIdString = match?.batchId ?? batchHex;

        const blockNumber = Number(event.blockNumber);
        const txHash = event.transactionHash;
        const logIndex = Number(event.logIndex ?? 0);

        const block = await provider.getBlock(blockNumber);
        const blockTs = block ? new Date(block.timestamp * 1000) : new Date();

        await prisma.productEvent.upsert({
          where: { txHash },
          update: { ipfsHash, blockNumber, logIndex },
          create: {
            batchId: batchIdString,
            eventType,
            eventName: eventType === 1 ? "Harvest" : `Event ${eventType}`,
            ipfsHash,
            actorAddress: actor,
            blockTimestamp: blockTs,
            txHash,
            blockNumber,
            logIndex,
            actorUserId: null,
            batchRefId: match?.id ?? "", // harus string
          },
        });

        console.log(`✅ Saved ProductEvent tx ${txHash} for batch ${batchIdString}`);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  );
}

startListener().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
