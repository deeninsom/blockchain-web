import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const events = await prisma.productEvent.findMany({
    where: { eventType: 99 },
    include: { batch: true }
  });
  console.log("EVENTS 99:", JSON.stringify(events, null, 2));
}

check().then(() => prisma.$disconnect());
