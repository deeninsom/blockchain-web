import { ethers } from "ethers";

const rpcUrl = "http://localhost:8545";

export const besuProvider = new ethers.JsonRpcProvider(rpcUrl);

export async function getBesuBlockNumber() {
  return await besuProvider.getBlockNumber();
}

export async function sendTestTransaction() {
  const privateKey = process.env.PRIVATE_KEY as string;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  const wallet = new ethers.Wallet(privateKey, besuProvider);
  console.log(wallet)

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: ethers.parseEther("0.01"),
  });

  console.log('tx', tx.hash)


  // await tx.wait();

  return tx.hash;
}
