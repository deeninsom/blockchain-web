import { NextResponse } from "next/server";

/**
 * Menggantikan semua instance BigInt di sebuah objek dengan string
 * sehingga dapat di-serialize dengan JSON.stringify().
 * * @param key Kunci properti
 * @param value Nilai properti
 * @returns Nilai yang telah diubah atau nilai asli
 */
export function bigIntReplacer(key: any, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/**
 * Membuat NextResponse yang menangani konversi BigInt.
 * * @param data Data yang akan di-serialize
 * @param status Kode status HTTP (default: 200)
 * @returns NextResponse
 */
export function jsonResponse(data: any, status: number = 200) {
  // Gunakan JSON.stringify manual dengan replacer
  const jsonString = JSON.stringify(data, bigIntReplacer);

  return new NextResponse(jsonString, {
    status: status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}