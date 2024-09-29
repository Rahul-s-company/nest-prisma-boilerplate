import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing industry
    await prisma.$executeRaw`TRUNCATE TABLE "partner_type" RESTART IDENTITY CASCADE`;

    // Create new industry
    await prisma.partnerType.createMany({
      data: [
        { type: 'CONSULTING' },
        { type: 'DISTRIBUTOR' },
        { type: 'INTEGRATOR' },
        { type: 'ISV' },
        { type: 'OEM' },
        { type: 'PROFESSIONAL' },
        { type: 'RESELLER' },
        { type: 'SERVICES' },
        { type: 'SYSTEMS' },
        { type: 'TRAINING' },
      ],
    });

    logger.log('Seed partnerType data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
