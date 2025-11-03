const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing job statuses...\n');

  try {
    // Add old enum values back temporarily
    console.log('Step 1: Adding old enum values...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELLED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
          ALTER TYPE "JobStatus" ADD VALUE 'CANCELLED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'READY_FOR_PICKUP' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
          ALTER TYPE "JobStatus" ADD VALUE 'READY_FOR_PICKUP';
        END IF;
      END $$;
    `);
    console.log('✓ Old enum values added\n');

    // Count jobs with old statuses
    console.log('Step 2: Checking for jobs with old statuses...');
    const cancelledCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Job" WHERE status::text = 'CANCELLED'
    `);
    const readyCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Job" WHERE status::text = 'READY_FOR_PICKUP'
    `);

    console.log(`Found ${cancelledCount[0].count} jobs with CANCELLED status`);
    console.log(`Found ${readyCount[0].count} jobs with READY_FOR_PICKUP status\n`);

    // Update jobs
    console.log('Step 3: Updating job statuses...');
    const updated1 = await prisma.$executeRawUnsafe(`
      UPDATE "Job" SET status = 'CUSTOMER_CANCELLED'::\"JobStatus\" WHERE status::text = 'CANCELLED'
    `);
    console.log(`✓ Updated ${updated1} jobs from CANCELLED to CUSTOMER_CANCELLED`);

    const updated2 = await prisma.$executeRawUnsafe(`
      UPDATE "Job" SET status = 'AWAITING_CUSTOMER_APPROVAL'::\"JobStatus\" WHERE status::text = 'READY_FOR_PICKUP'
    `);
    console.log(`✓ Updated ${updated2} jobs from READY_FOR_PICKUP to AWAITING_CUSTOMER_APPROVAL\n`);

    console.log('✅ Status migration complete!');
    console.log('\nNote: The old enum values (CANCELLED, READY_FOR_PICKUP) still exist in the enum');
    console.log('but are no longer used. This is normal for PostgreSQL.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✅ Migration successful!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
