import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { generateNewWallet } from "@/lib/walletUtils";
import { encrypt } from "@/lib/encryptionUtils";

const validRoles = ["PETANI", "KOLEKTOR", "DISTRIBUTOR", "PENGECER", "SUPERADMIN", 'ADMIN'] as const;
const validStatuses = ["ACTIVE", "INACTIVE"] as const;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const actorAddress = url.searchParams.get('address'); // Ambil parameter 'address' dari URL

    let whereClause = {};

    // Jika parameter 'address' ditemukan di URL
    if (actorAddress) {
      whereClause = {
        // Gunakan actorAddress untuk memfilter
        actorAddress: {
          equals: actorAddress, // Cari yang persis sama
          mode: 'insensitive', // Opsional: jika Anda ingin pencarian tidak peka huruf besar/kecil (tergantung DB)
        },
      };
    }

    // Eksekusi query ke database menggunakan whereClause
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        actorAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });


    if (!users || users.length === 0) {
      // Jika mencari berdasarkan address dan tidak ada hasil, kembalikan 404/Kosong
      if (actorAddress) {
        return NextResponse.json({ message: "Pengguna tidak ditemukan berdasarkan alamat aktor ini." }, { status: 404 });
      }
      return NextResponse.json([]); // Jika tidak ada query, dan tidak ada pengguna sama sekali
    }

    // Jika ada query address, dan hanya ingin mengembalikan satu hasil,
    // kita bisa langsung kembalikan user pertama (atau objek tunggal jika Anda yakin hasilnya unik)
    if (actorAddress) {
      return NextResponse.json(users[0]);
    }

    // Kembalikan semua hasil jika tidak ada query 'address'
    return NextResponse.json(users);

  } catch (err) {
    console.error("GET Users Error:", err);
    return NextResponse.json({ error: "Gagal mengambil data pengguna" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, role, status, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, Email, dan Password wajib diisi" }, { status: 400 });
    }

    const finalRole = validRoles.includes(role) ? role : "PETANI";
    const finalStatus = validStatuses.includes(status) ? status : "ACTIVE";

    const hashedPassword = await hash(password, 10);
    const { address, privateKey } = generateNewWallet();

    console.log(`\n--- [DEV WARNING] New Wallet Created for ${email} ---`);
    console.log(`Address: ${address}`);
    console.log(`Private Key: ${privateKey}\n--------------------------------------`);
    const encryptedKey = encrypt(privateKey);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: finalRole,
        status: finalStatus,
        actorAddress: address,
        encryptedPrivateKey: encryptedKey
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        actorAddress: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    console.error("POST User Error:", err);
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0];
      let message = "Email sudah terdaftar, silakan gunakan yang lain";
      if (field === 'actorAddress') {
        message = "Terjadi konflik address, coba lagi.";
      }
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Server error: Gagal memproses permintaan registrasi" },
      { status: 500 }
    );
  }
}