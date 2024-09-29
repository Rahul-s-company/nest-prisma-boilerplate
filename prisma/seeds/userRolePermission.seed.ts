import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('seeding data');

async function main() {
  try {
    const masterPermissions = [
      {
        spaceId: 21,
        spaceName: 'Role',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
      },
      {
        spaceId: 20,
        spaceName: 'User',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 2,
        spaceName: 'Kpi',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 3,
        spaceName: 'ManageStackholders',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 4,
        spaceName: 'Broadcast',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 5,
        spaceName: 'PartnerPlan',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 6,
        spaceName: 'Goal',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 7,
        spaceName: 'Plan',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 8,
        spaceName: 'Initiative',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 9,
        spaceName: 'MyPartners',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 10,
        spaceName: 'Analytics',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 11,
        spaceName: 'Projects',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 12,
        spaceName: 'ScoreCard',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 14,
        spaceName: 'Assets',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 15,
        spaceName: 'Calender',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 16,
        spaceName: 'Chat',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 17,
        spaceName: 'Dashboard',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 18,
        spaceName: 'MyActivity',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 19,
        spaceName: 'Notifications',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
    ];

    const enableOpportunityPermissions = [
      {
        spaceId: 1,
        spaceName: 'MyOpportunity',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 13,
        spaceName: 'PipelineManager',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      }
    ];

    const disableOpportunityPermissions = [
      {
        spaceId: 1,
        spaceName: 'MyOpportunity',
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 13,
        spaceName: 'PipelineManager',
        spaceParentId: 9,
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      }
    ];

    const accountantPermissions = [
      {
        spaceId: 21,
        spaceName: 'Role',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 20,
        spaceName: 'User',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 2,
        spaceName: 'Kpi',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 3,
        spaceName: 'ManageStackholders',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 4,
        spaceName: 'Broadcast',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 5,
        spaceName: 'PartnerPlan',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 6,
        spaceName: 'Goal',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 7,
        spaceName: 'Plan',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 8,
        spaceName: 'Initiative',
        spaceParentId: 5,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 9,
        spaceName: 'MyPartners',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
      },
      {
        spaceId: 10,
        spaceName: 'Analytics',
        spaceParentId: 9,
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 11,
        spaceName: 'Projects',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 12,
        spaceName: 'ScoreCard',
        spaceParentId: 9,
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 14,
        spaceName: 'Assets',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 15,
        spaceName: 'Calender',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 16,
        spaceName: 'Chat',
        spaceParentId: 9,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 17,
        spaceName: 'Dashboard',
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
      {
        spaceId: 18,
        spaceName: 'MyActivity',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      {
        spaceId: 19,
        spaceName: 'Notifications',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
    ];

    // Define a function to update role permissions
    async function updateRolePermissions(roleName, permissions) {
      await prisma.userRole.update({
        where: { name: roleName },
        data: { permissions },
      });
    }

    // Update permissions for multiple roles
    async function updateAllRolePermissions() {
      const rolesToUpdate = [
        {
          name: 'SuperAdmin',
          permissions: [...masterPermissions, ...disableOpportunityPermissions],
        },
        {
          name: 'PartnerManager',
          permissions: [...masterPermissions, ...enableOpportunityPermissions],
        },
        {
          name: 'Leadership',
          permissions: [...masterPermissions, ...disableOpportunityPermissions],
        },
        {
          name: 'AccountManager',
          permissions: [
            ...accountantPermissions,
            ...enableOpportunityPermissions,
          ],
        },
        {
          name: 'Contributor',
          permissions: [
            ...accountantPermissions,
            ...disableOpportunityPermissions,
          ],
        },
      ];

      for (const role of rolesToUpdate) {
        await updateRolePermissions(role.name, role.permissions);
      }
    }

    // Call the function to update all role permissions
    updateAllRolePermissions();

    logger.log('Seed data inserted successfully!');
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
