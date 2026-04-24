import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Wallet } from "ethers";

const prisma = new PrismaClient();

async function main() {
  const password = "dev"; // password default
  const hashedPassword = await bcrypt.hash(password, 10);

  const initialUsers = [
    {
      name: "SUPERADMIN",
      email: "superadmin@gmail.com",
      password: hashedPassword,
      role: "SUPERADMIN",
      status: "ACTIVE" as any,
    },
    {
      name: "ADMIN",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE" as any,
    },
    {
      name: "PETANI",
      email: "petani@gmail.com",
      password: hashedPassword,
      role: "FARMER",
      status: "ACTIVE" as any,
    },
    {
      name: "Operator Gudang Pusat",
      email: "op_gudang_pusat@gmail.com",
      password: hashedPassword,
      role: "WAREHOUSE_CENTER",
      status: "ACTIVE" as any,
    },
    {
      name: "Operator Gudang Retail",
      email: "op_gudang_retail@gmail.com",
      password: hashedPassword,
      role: "WAREHOUSE_RETAIL",
      status: "ACTIVE" as any,
    },
  ];

  const dataWithWallets = initialUsers.map((user) => {
    // Tiru page create user
    const wallet = Wallet.createRandom();
    const { address, privateKey } = wallet;
    const encryptedKey = privateKey;

    console.log(`[Seed] Meng-generate wallet untuk ${user.email} -> ${address}`);

    return {
      ...user,
      actorAddress: address,
      encryptedPrivateKey: encryptedKey,
    };
  });

  for (const u of dataWithWallets) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        actorAddress: u.actorAddress,
        encryptedPrivateKey: u.encryptedPrivateKey,
      },
      create: u,
    });
  }

  console.log("✅ Seed user beserta wallet masing-masing berhasil dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
