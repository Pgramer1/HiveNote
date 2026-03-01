const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Resource' AND column_name = 'extractedText'`
  );
  console.log("extractedText column exists:", result.length > 0);

  const enumResult = await prisma.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'ResourceType'`
  );
  console.log("ResourceType values:", enumResult.map(r => r.enumlabel));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
