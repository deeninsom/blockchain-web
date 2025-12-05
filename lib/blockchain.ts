import { ethers } from "ethers";
import artifact from "@/lib/hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json";

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
export const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

export const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS!,
  artifact.abi,
  wallet
);
