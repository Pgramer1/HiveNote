/**
 * Database Migration Verification Script
 * 
 * This script helps verify that your migration from local PostgreSQL to Neon
 * was successful by comparing record counts and checking data integrity.
 * 
 * Usage:
 *   1. Before migration: node verify-migration.js --export
 *   2. After migration: node verify-migration.js --verify
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function getCounts() {
  console.log('📊 Counting records in database...\n');
  
  const counts = {
    users: await prisma.user.count(),
    resources: await prisma.resource.count(),
    votes: await prisma.vote.count(),
    favorites: await prisma.favorite.count(),
    comments: await prisma.comment.count(),
    commentLikes: await prisma.commentLike.count(),
    accounts: await prisma.account.count(),
    sessions: await prisma.session.count(),
  };

  return counts;
}

async function getDataSample() {
  console.log('📋 Getting data samples...\n');
  
  const samples = {
    latestUser: await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true }
    }),
    latestResource: await prisma.resource.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, type: true, createdAt: true }
    }),
    totalViewCount: await prisma.resource.aggregate({
      _sum: { viewCount: true }
    }),
  };

  return samples;
}

async function exportCounts() {
  console.log('🔄 Exporting database counts for verification...\n');
  
  try {
    const counts = await getCounts();
    const samples = await getDataSample();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      database: 'Local PostgreSQL',
      counts,
      samples,
    };

    fs.writeFileSync(
      'migration-counts.json',
      JSON.stringify(exportData, null, 2)
    );

    console.log('✅ Export successful!\n');
    console.log('Record counts:');
    console.log('─'.repeat(40));
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(20)} ${count}`);
    });
    console.log('─'.repeat(40));
    console.log('\n💾 Counts saved to: migration-counts.json\n');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyCounts() {
  console.log('🔍 Verifying migration...\n');
  
  try {
    // Check if export file exists
    if (!fs.existsSync('migration-counts.json')) {
      console.error('❌ No migration-counts.json found!');
      console.log('💡 Run with --export flag before migration first.\n');
      process.exit(1);
    }

    const beforeData = JSON.parse(fs.readFileSync('migration-counts.json', 'utf-8'));
    const afterCounts = await getCounts();
    const afterSamples = await getDataSample();

    console.log('Comparison Results:');
    console.log('═'.repeat(60));
    console.log(`${'Table'.padEnd(20)} ${'Before'.padEnd(12)} ${'After'.padEnd(12)} Status`);
    console.log('─'.repeat(60));

    let allMatch = true;
    Object.entries(beforeData.counts).forEach(([table, beforeCount]) => {
      const afterCount = afterCounts[table];
      const matches = beforeCount === afterCount;
      const status = matches ? '✅' : '❌';
      
      if (!matches) allMatch = false;
      
      console.log(
        `${table.padEnd(20)} ${String(beforeCount).padEnd(12)} ${String(afterCount).padEnd(12)} ${status}`
      );
    });
    console.log('═'.repeat(60));

    if (allMatch) {
      console.log('\n🎉 SUCCESS! All record counts match!\n');
      
      console.log('Data Integrity Checks:');
      console.log('─'.repeat(40));
      console.log('Latest User:', afterSamples.latestUser?.email || 'None');
      console.log('Latest Resource:', afterSamples.latestResource?.title || 'None');
      console.log('Total Views:', afterSamples.totalViewCount._sum.viewCount || 0);
      console.log('─'.repeat(40));
      
      console.log('\n✨ Migration verified successfully!');
      console.log('📌 Next steps:');
      console.log('   1. Test your application thoroughly');
      console.log('   2. Verify authentication works');
      console.log('   3. Test file uploads and downloads');
      console.log('   4. Check all API endpoints\n');
    } else {
      console.log('\n⚠️  WARNING! Record count mismatch detected!');
      console.log('📌 Action required:');
      console.log('   1. Check the import process');
      console.log('   2. Review error logs');
      console.log('   3. Consider re-running the import\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function testConnection() {
  console.log('🔌 Testing database connection...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    
    const url = process.env.DATABASE_URL;
    if (url?.includes('neon.tech')) {
      console.log('📡 Connected to: Neon Database');
    } else if (url?.includes('localhost')) {
      console.log('📡 Connected to: Local PostgreSQL');
    } else {
      console.log('📡 Connected to: Unknown database');
    }
    
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('PostgreSQL Version:', result);
    console.log();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--export')) {
  exportCounts();
} else if (args.includes('--verify')) {
  verifyCounts();
} else if (args.includes('--test')) {
  testConnection();
} else {
  console.log('Database Migration Verification Tool\n');
  console.log('Usage:');
  console.log('  node verify-migration.js --export   Export current counts before migration');
  console.log('  node verify-migration.js --verify   Verify counts after migration');
  console.log('  node verify-migration.js --test     Test database connection\n');
  console.log('Example workflow:');
  console.log('  1. node verify-migration.js --export   (before switching to Neon)');
  console.log('  2. [Perform migration steps]');
  console.log('  3. node verify-migration.js --verify   (after switching to Neon)\n');
}
