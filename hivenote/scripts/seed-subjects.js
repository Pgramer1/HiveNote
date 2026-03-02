const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSubjects() {
  console.log('🌱 Seeding subjects for CSE Batch 28 Semester 1...');

  const subjects = [
    { code: 'CSE101', name: 'Introduction to Programming' },
    { code: 'CSE102', name: 'Data Structures' },
    { code: 'MATH101', name: 'Calculus I' },
    { code: 'PHY101', name: 'Physics I' },
    { code: 'ENG101', name: 'Technical English' },
    { code: 'CS101', name: 'Computer Fundamentals' },
  ];

  try {
    for (const subject of subjects) {
      const created = await prisma.subject.create({
        data: {
          code: subject.code,
          name: subject.name,
          department: 'CSE',
          semester: 1,
          university: 'KUET',
        },
      });
      console.log(`✅ Created: ${created.code} - ${created.name}`);
    }

    console.log('\n✨ Seeding complete! You can now:');
    console.log('1. Navigate to /university/cse/28/1');
    console.log('2. You should see 6 subject folders');
    console.log('3. Click on any subject to view its resources');
    console.log('4. Upload resources to specific subjects');
  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSubjects();
