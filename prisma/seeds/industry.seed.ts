import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing industry
    await prisma.$executeRaw`TRUNCATE TABLE "industry" RESTART IDENTITY CASCADE`;

    // Create new industry
    await prisma.industry.createMany({
      data: [
        { name: 'Aerospace', status: 'ACTIVE' },
        { name: 'Agriculture', status: 'ACTIVE' },
        { name: 'Automotive', status: 'ACTIVE' },
        { name: 'Computers & Electronics', status: 'ACTIVE' },
        { name: 'Consumer Goods', status: 'ACTIVE' },
        { name: 'Education', status: 'ACTIVE' },
        { name: 'Energy - Oil & Gas', status: 'ACTIVE' },
        { name: 'Energy - Power & Utilities', status: 'ACTIVE' },
        { name: 'Financial Services', status: 'ACTIVE' },
        { name: 'Gaming', status: 'ACTIVE' },
        { name: 'Government', status: 'ACTIVE' },
        { name: 'Healthcare', status: 'ACTIVE' },
        { name: 'Hospitality', status: 'ACTIVE' },
        { name: 'Life Sciences', status: 'ACTIVE' },
        { name: 'Manufacturing', status: 'ACTIVE' },
        { name: 'Marketing & Advertising', status: 'ACTIVE' },
        { name: 'Media & Entertainment', status: 'ACTIVE' },
        { name: 'Mining', status: 'ACTIVE' },
        { name: 'Non-Profit Organization', status: 'ACTIVE' },
        { name: 'Professional Services', status: 'ACTIVE' },
        { name: 'Real Estate & Construction', status: 'ACTIVE' },
        { name: 'Retail', status: 'ACTIVE' },
        { name: 'Software & Internet', status: 'ACTIVE' },
        { name: 'Telecommunications', status: 'ACTIVE' },
        { name: 'Transportation & Logistics', status: 'ACTIVE' },
        { name: 'Travel', status: 'ACTIVE' },
        { name: 'Wholesale & Distribution', status: 'ACTIVE' },
      ],
    });

    logger.log('Seed industry data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
