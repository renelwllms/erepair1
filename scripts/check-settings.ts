import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findFirst();

  if (settings) {
    console.log('Settings found:');
    console.log('Company Name:', settings.companyName);
    console.log('Company Logo:', settings.companyLogo || '(not set)');
    console.log('Company Email:', settings.companyEmail || '(not set)');
  } else {
    console.log('No settings found in database');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
