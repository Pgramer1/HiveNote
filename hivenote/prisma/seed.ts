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
  console.log('🌱 Starting database seeding...\n');

  // Find or create test user
  console.log('Setting up test user...');
  const user = await prisma.user.upsert({
    where: { email: "test@hivenote.dev" },
    update: {},
    create: {
      name: "Test User",
      email: "test@hivenote.dev",
    },
  });
  console.log(`✅ User ready: ${user.email}\n`);

  // Create test subjects for CSE Semester 1
  console.log('Creating subjects for CSE Batch 28 Semester 1...');
  const subjects = [
    { code: 'CSE101', name: 'Introduction to Programming' },
    { code: 'CSE102', name: 'Data Structures' },
    { code: 'MATH101', name: 'Calculus I' },
    { code: 'PHY101', name: 'Physics I' },
    { code: 'ENG101', name: 'Technical English' },
    { code: 'CS101', name: 'Computer Fundamentals' },
  ];

  for (const subject of subjects) {
    try {
      const created = await prisma.subject.create({
        data: {
          code: subject.code,
          name: subject.name,
          department: 'CSE',
          semester: 1,
          university: 'KUET',
        },
      });
      console.log(`✅ Created subject: ${created.code} - ${created.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Subject ${subject.code} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }
  console.log('\n');

  console.log('✨ Seeding complete! You can now:');
  console.log('  1. Navigate to /university/cse/28/1');
  console.log('  2. See 6 subject folders with colored cards');
  console.log('  3. Click any subject to view its resources');
  console.log('  4. Upload resources to specific subjects');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
