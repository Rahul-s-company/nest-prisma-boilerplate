import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('seeding data');

async function main() {
  try {
    // Delete existing stages
    await prisma.$executeRaw`TRUNCATE TABLE "opportunity_stages" RESTART IDENTITY CASCADE`;

    // Create new stages
    
    await prisma.opportunityStages.createMany({
      data: [
        { stage: 'Prospecting', probability: '10%', salesforceStage:'Prospecting' },
        { stage: 'Qualification', probability: '10%', salesforceStage:'Qualification' },
        { stage: 'Discovery', probability: '20%', salesforceStage:'Need Analysis' },
        { stage: 'Demo or Meeting', probability: '50%' , salesforceStage:'Value Proposition'},
        { stage: 'Validation', probability: '50%' , salesforceStage:'Id. Decision Makers'},
        { stage: 'Proposal', probability: '60%' , salesforceStage:'Perception Analysis'},
        { stage: 'Negotiation', probability: '75%' , salesforceStage:'Proposal/Price Quote'},
        { stage: 'Commitment', probability: '80%' , salesforceStage:'Negotiation/Review'},
        { stage: 'Closed Won', probability: '100%' , salesforceStage:'Closed Won'},
        { stage: 'Closed Lost', probability: '0%' , salesforceStage:'Closed Lost'},
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
