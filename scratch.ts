import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const s = await prisma.service.findMany({ select: { title: true, icon: true } });
  console.log(JSON.stringify(s, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
