import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing spaces
    await prisma.$executeRaw`TRUNCATE TABLE "space" RESTART IDENTITY CASCADE`;

    // Create new spaces
    await prisma.category.createMany({
      data: [
        { category: 'Build' },
        { category: 'Market' },
        { category: 'Sell' },
        { category: 'Scale' },
        { category: 'Optimise' },
      ],
    });

    logger.log('Seed Category data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
