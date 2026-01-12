import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = "dev"; // password default
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.createMany({
    data: [
      {
        name: "SUPERADMIN",
        email: "superadmin@gmail.com",
        password: hashedPassword,
        role: "SUPERADMIN",
        status: "ACTIVE",
      },
      {
        name: "ADMIN",
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        name: "PETANI ",
        email: "petani@gmail.com",
        password: hashedPassword,
        role: "FARMER",
        status: "ACTIVE",
      },
      {
        name: "Operator Gudang Pusat",
        email: "op_gudang_pusat@gmail.com",
        password: hashedPassword,
        role: "WAREHOUSE_CENTER",
        status: "ACTIVE",
      },
      {
        name: "Operator Gudang Retail",
        email: "op_gudang_retail@gmail.com",
        password: hashedPassword,
        role: "WAREHOUSE_RETAIL",
        status: "ACTIVE",
      },
    ],
    skipDuplicates: true, // aman kalau di-run ulang
  });

  console.log("✅ Seed user berhasil dibuat");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
