import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing roles
    await prisma.$executeRaw`TRUNCATE TABLE "user_role" RESTART IDENTITY CASCADE`;

    // Create new roles
    await prisma.userRole.createMany({
      data: [
        { name: 'SuperAdmin' },
        { name: 'Leadership' },
        { name: 'AccountManager' },
        { name: 'PartnerManager' },
        { name: 'Contributor' },
        // Add more roles as needed
      ],
    });

    logger.log('Seed data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
