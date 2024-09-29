import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing spaces
    await prisma.$executeRaw`TRUNCATE TABLE "space" RESTART IDENTITY CASCADE`;

    // Create new spaces
    await prisma.space.createMany({
      data: [
        { name: 'MyOpportunity' },
        { name: 'Kpi' },
        { name: 'ManageStackholders' },
        { name: 'Broadcast' },
        { name: 'PartnerPlan' },
        { name: 'Goal', spaceParentId: 5 },
        { name: 'Plan', spaceParentId: 5 },
        { name: 'Initiative', spaceParentId: 5 },
        { name: 'MyPartners' },
        { name: 'Analytics', spaceParentId: 9 },
        { name: 'Projects', spaceParentId: 9 },
        { name: 'ScoreCard', spaceParentId: 9 },
        { name: 'PipelineManager', spaceParentId: 9 },
        { name: 'Assets', spaceParentId: 9 },
        { name: 'Calender', spaceParentId: 9 },
        { name: 'Chat', spaceParentId: 9 },
        { name: 'Dashboard' },
        { name: 'MyActivity' },
        { name: 'Notifications' },
        { name: 'User' },
        { name: 'Role' },
      ],
    });

    logger.log('Seed Space data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
