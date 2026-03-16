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

  // Seed Adani University departments
  console.log('Creating departments for Adani University...');
  const departments = [
    { 
      code: 'CSE', 
      name: 'Computer Science & Engineering',
      description: 'Software, AI, and Computing'
    },
    { 
      code: 'ICT', 
      name: 'Information & Communication Technology',
      description: 'Networks, Communication & IT'
    },
    { 
      code: 'CIE', 
      name: 'Computer & Internet Engineering',
      description: 'Internet Tech & Systems'
    },
  ];

  const createdDepartments: any = {};
  for (const dept of departments) {
    const created = await prisma.departmentConfig.upsert({
      where: {
        code_university: {
          code: dept.code,
          university: 'Adani University',
        },
      },
      update: {
        name: dept.name,
        description: dept.description,
      },
      create: {
        code: dept.code,
        name: dept.name,
        description: dept.description,
        university: 'Adani University',
      },
    });
    createdDepartments[dept.code] = created;
    console.log(`✅ Department: ${created.code} - ${created.name}`);
  }
  console.log('\n');

  // Seed batches for each department
  console.log('Creating batches...');
  const batches = [
    { code: '28', years: '2024-2028' },
    { code: '27', years: '2023-2027' },
    { code: '26', years: '2022-2026' },
    { code: '25', years: '2021-2025' },
  ];

  for (const dept of Object.values(createdDepartments)) {
    for (const batch of batches) {
      await prisma.batchConfig.upsert({
        where: {
          code_university_departmentId: {
            code: batch.code,
            university: 'Adani University',
            departmentId: (dept as any).id,
          },
        },
        update: {
          years: batch.years,
        },
        create: {
          code: batch.code,
          years: batch.years,
          university: 'Adani University',
          departmentId: (dept as any).id,
        },
      });
    }
    console.log(`✅ Created batches for ${(dept as any).code}`);
  }
  console.log('\n');

  // Create test subjects for CSE Semester 1
  console.log('Creating subjects for CSE Semester 1...');
  const cseDept = createdDepartments['CSE'];
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
          departmentId: cseDept.id,
          semester: 1,
          university: 'Adani University',
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
  console.log('  5. Visit /admin to manage departments, batches, and subjects');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
