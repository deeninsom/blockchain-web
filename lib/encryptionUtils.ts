// src/lib/encryptionUtils.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Master Key harus berukuran 32 byte. Ambil dari variabel lingkungan.
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
console.log('ENCRYPTION_MASTER_KEY', ENCRYPTION_MASTER_KEY?.length)
// --- Perbaikan Kunci ---
// Meskipun ini di awal file, TypeScript seringkali memerlukan kepastian tipe di dalam fungsi.
if (!ENCRYPTION_MASTER_KEY) {
  // Memastikan kunci tersedia dan panjangnya benar sebelum fungsi diekspor
  throw new Error('ENCRYPTION_MASTER_KEY (32 bytes) must be set in .env');
}

/**
 * Mengenkripsi string (private key) menggunakan AES-256-GCM.
 * @param text Private key yang belum terenkripsi.
 * @returns String terenkripsi dalam format: "iv:content:tag".
 */
export function encrypt(text: string): string {
  const iv = randomBytes(16); // Initialization Vector (IV)

  // PERBAIKAN: Menggunakan `!` untuk memastikan ENCRYPTION_MASTER_KEY adalah string (CipherKey)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_MASTER_KEY!, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

/**
 * Mendekripsi string yang dienkripsi (private key).
 * @param encryptedText String terenkripsi.
 * @returns Private key yang sudah didekripsi.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format.');

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], 'hex');

  // PERBAIKAN: Menggunakan `!` untuk memastikan ENCRYPTION_MASTER_KEY adalah string (CipherKey)
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_MASTER_KEY!, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}