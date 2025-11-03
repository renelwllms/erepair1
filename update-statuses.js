const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for jobs with old status values...');
  
  // Update CANCELLED to CUSTOMER_CANCELLED
  const cancelledJobs = await prisma.$executeRawUnsafe(
    `UPDATE "Job" SET status = 'CUSTOMER_CANCELLED' WHERE status = 'CANCELLED'`
  );
  
  console.log(`Updated ${cancelledJobs} jobs from CANCELLED to CUSTOMER_CANCELLED`);
  
  // Update READY_FOR_PICKUP to AWAITING_CUSTOMER_APPROVAL
  const readyJobs = await prisma.$executeRawUnsafe(
    `UPDATE "Job" SET status = 'AWAITING_CUSTOMER_APPROVAL' WHERE status = 'READY_FOR_PICKUP'`
  );
  
  console.log(`Updated ${readyJobs} jobs from READY_FOR_PICKUP to AWAITING_CUSTOMER_APPROVAL`);
  
  console.log('Status migration complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
