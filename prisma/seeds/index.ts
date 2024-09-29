// prisma/seeds/index.ts
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('seeding data');
const prisma = new PrismaClient();

async function seed() {
  const seedOperations = [
    { model: 'userRole', seedFile: 'userRoles.seed.ts' },
    { model: 'country', seedFile: 'countryRegion.seed.ts' },
    { model: 'industry', seedFile: 'industry.seed.ts' },
    { model: 'space', seedFile: 'space.seed.ts' },
    { model: 'opportunityStages', seedFile: 'opportunityStages.seed.ts' },
    { model: 'category', seedFile: 'category.seed.ts' },
    { model: 'partnerType', seedFile: 'partnerType.seed.ts' },
  ];

  for (const operation of seedOperations) {
    const count = await prisma[operation.model].count();

    if (count === 0) {
      logger.log(`Seeding ${operation.model}...`);
      try {
        execSync(`ts-node prisma/seeds/${operation.seedFile}`, {
          stdio: 'inherit',
        });
        logger.log(`${operation.model} seeded successfully.`);
      } catch (error) {
        logger.error(`Error seeding ${operation.model}:`, error);
      }
    } else {
      logger.log(`${operation.model} already has data, skipping seed.`);
    }
  }

  //for update permission data role wise
  const firstRecord = await prisma.userRole.findFirst({ where: { id: 1 } });

  if (!firstRecord.permissions) {
    execSync('ts-node prisma/seeds/userRolePermission.seed.ts');
  }
}

seed()
  .then(() => {
    logger.log('All seed operations completed!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error in seed script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
