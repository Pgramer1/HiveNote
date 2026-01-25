import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@hivenote.dev",
    },
  });

  await prisma.resource.createMany({
    data: [
      {
        title: "DSA Notes",
        description: "Important DSA concepts",
        type: "PDF",
        fileUrl: "https://example.com/dsa.pdf",
        uploadedBy: user.id,
      },
      {
        title: "Operating Systems Playlist",
        description: "YouTube OS lectures",
        type: "LINK",
        fileUrl: "https://youtube.com/playlist",
        uploadedBy: user.id,
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
