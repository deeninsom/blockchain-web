// src/lib/walletUtils.ts

import { ethers } from 'ethers';

/**
 * Membuat pasangan kunci (key pair) baru secara acak.
 * @returns { object } Objek yang berisi wallet address dan private key.
 */
export function generateNewWallet(): { address: string, privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}