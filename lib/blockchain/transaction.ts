// src/lib/blockchain/transaction.ts
import { ethers, Contract, Wallet } from 'ethers';
// Diasumsikan abi telah diimpor dengan benar dari Hardhat artifacts
import { abi } from '../hardhat/artifacts/contracts/ProductTraceability.sol/ProductTraceability.json';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

interface TxResult {
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
  blockTimestamp: Date;
}

/**
 * Menandatangani dan mengirim transaksi ke local blockchain (Hardhat Network).
 * @param expectedActorAddress Wallet address of the user (aktor sebenarnya) yang dicatat di event.
 * @param batchId ID Batch (sebagai string)
 * @param ipfsHash The Content Identifier (CID) to record on-chain.
 * @param eventType The type of event (e.g., 1 for Harvest).
 * @returns Hasil transaksi yang sebenarnya.
 */
export async function signAndSendTransaction(
  expectedActorAddress: string, // Diubah namanya untuk kejelasan
  batchId: string,
  ipfsHash: string,
  eventType: number
): Promise<TxResult> {
  // 1. Validasi Environment
  if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    throw new Error("Blockchain configuration missing: RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS not set.");
  }

  // 2. Setup Provider dan Signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Verifikasi Aktor (Log Warning)
  if (signer.address.toLowerCase() !== expectedActorAddress.toLowerCase()) {
    console.warn(`[WARNING] Signer address (${signer.address}) does not match expected actorAddress (${expectedActorAddress}). Using signer address to send TX.`);
  }

  // 3. Setup Contract Instance
  const contract = new Contract(CONTRACT_ADDRESS, abi, signer);

  // 4. Logging Transaksi
  console.log(`\n--- [REAL TX SIMULATION] ---`);
  console.log(`Signer Address (Tx Sender): ${signer.address}`);
  console.log(`Expected Actor: ${expectedActorAddress}`); // Logging Expected Actor
  console.log(`Batch ID: ${batchId}`);
  console.log(`Data (IPFS Hash): ${ipfsHash}`);
  console.log(`Event Type: ${eventType}`);
  console.log(`Sending transaction...`);

  // 5. Konversi Batch ID ke bytes32
  // KOREKSI: Gunakan konversi standar tanpa padding manual
  const batchIdBytes = ethers.encodeBytes32String(batchId);

  // 6. Panggil fungsi kontrak
  // KOREKSI KRITIS: Urutan parameter harus sesuai dengan kontrak Solidity (bytes32, address, uint8, string)
  const transactionResponse = await contract.recordEvent(
    batchIdBytes,             // Parameter 1: bytes32 _batchId
    expectedActorAddress,     // Parameter 2: address _actorAddress
    eventType,                // Parameter 3: uint8 _eventType
    ipfsHash                  // Parameter 4: string _ipfsHash
  );

  // 7. Tunggu konfirmasi (Mining)
  const receipt = await transactionResponse.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction failed on the local chain. Hash: ${transactionResponse.hash}`);
  }

  // 8. Ambil Block Timestamp
  let blockTimestamp: Date;
  try {
    const block = await provider.getBlock(receipt.blockNumber);
    if (block && block.timestamp) {
      blockTimestamp = new Date(Number(block.timestamp) * 1000);
    } else {
      console.warn("Could not retrieve block timestamp. Using current date as fallback.");
      blockTimestamp = new Date();
    }
  } catch (e) {
    console.error("Failed to fetch block details for timestamp.", e);
    blockTimestamp = new Date();
  }

  // 9. Ekstrak data hasil transaksi
  const txResult: TxResult = {
    txHash: receipt.hash,
    blockNumber: BigInt(receipt.blockNumber),
    logIndex: receipt.logs.length > 0 ? receipt.logs[0].index : 0,
    blockTimestamp: blockTimestamp,
  };

  console.log(`Transaction SUCCESS! Hash: ${txResult.txHash}`);
  console.log(`Block: ${txResult.blockNumber.toString()} at ${blockTimestamp.toISOString()}`);
  console.log(`-------------------------------\n`);

  return txResult;
}