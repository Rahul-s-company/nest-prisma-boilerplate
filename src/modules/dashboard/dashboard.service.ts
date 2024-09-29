import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { UpdateDashboardDto } from './dashboard.dto';
import { dashboardConfig } from './dashbord.constant';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.dashboardUncheckedCreateInput) {
    return this.prisma.dashboard.create({
      data,
    });
  }

  async findOne(userId: number) {
    const dashboardInfo = await this.prisma.dashboard.findFirst({
      where: { userId },
    });

    const config: any = dashboardInfo
      ? dashboardInfo.dataConfig
      : dashboardConfig;

    return config;
  }

  async update(updateDashboardDto: UpdateDashboardDto, userId: number) {
    const dashboardInfo = await this.prisma.dashboard.findFirst({
      where: { userId },
    });

    if (dashboardInfo) {
      return this.prisma.dashboard.updateMany({
        where: { userId },
        data: updateDashboardDto,
      });
    } else {
      updateDashboardDto.userId = userId;
      updateDashboardDto.createdBy = userId;

      const createDashboardConfig = {
        dataConfig: updateDashboardDto.dataConfig,
        userId: userId,
        createdBy: userId,
      };

      return this.create(createDashboardConfig);
    }
  }

  async createDashboard(userId: number, orgId: number) {
    const dashboardInfo = await this.prisma.dashboard.findFirst({
      where: { userId },
    });

    const config: any = dashboardInfo
      ? dashboardInfo.dataConfig
      : dashboardConfig;
    const dashboardData: any = [];
    let index = 0;

    for (const data of config) {
      dashboardData[index] = data;

      if (data.module === 'opportunity') {
        if (data.features.byMonth) {
          const byMonth = await this.getMonthlyOpportunities(orgId);
          dashboardData[index].byMonth = byMonth;
        }

        if (data.features.byIndustry) {
          const byIndustry = await this.getIndustryOpportunities(orgId);
          dashboardData[index].byIndustry = byIndustry;
        }

        if (data.features.byCountry) {
          const byCountry = await this.getCountryOpportunities(orgId);
          dashboardData[index].byCountry = byCountry;
        }

        if (data.features.byCompany) {
          const byCompany = await this.getCompanyOpportunities(orgId);
          dashboardData[index].byCompany = byCompany;
        }

        if (data.features.byStage) {
          const byStage = await this.filterOpportunitiesBy(orgId, 'stage');
          dashboardData[index].byStage = byStage;
        }

        if (data.features.byStatus) {
          const byStatus = await this.filterOpportunitiesBy(orgId, 'status');
          dashboardData[index].byStatus = byStatus;
        }

        if (data.features.byUser) {
          const byUser = await this.getOpportunitiesByUser(orgId);
          dashboardData[index].byUser = byUser;
        }
      }

      if (data.module === 'initiatives') {
        if (data.features.byProgress) {
          const byProgress = await this.getInitiativesByProgress(orgId);
          dashboardData[index].byProgress = byProgress;
        }

        if (data.features.byOwners) {
          const byOwners = await this.getInitiativesByOwner(orgId);
          dashboardData[index].byOwners = byOwners;
        }

        if (data.features.byCountry) {
          const byCountry = await this.getInitiativesBy(orgId, 'country');
          dashboardData[index].byCountry = byCountry;
        }

        if (data.features.byGeo) {
          const byGeo = await this.getInitiativesBy(orgId, 'geo');
          dashboardData[index].byGeo = byGeo;
        }

        if (data.features.byRegion) {
          const byRegion = await this.getInitiativesBy(orgId, 'region');
          dashboardData[index].byRegion = byRegion;
        }
      }

      if (data.module === 'goals') {
        if (data.features.byProgress) {
          const byProgress = await this.getGoalsByProgress(orgId);
          dashboardData[index].byProgress = byProgress;
        }

        if (data.features.byOwners) {
          const byOwners = await this.getGoalsByOwner(orgId);
          dashboardData[index].byOwners = byOwners;
        }

        if (data.features.byCountry) {
          const byCountry = await this.getGoalsBy(orgId, 'country');
          dashboardData[index].byCountry = byCountry;
        }

        if (data.features.byRegion) {
          const byRegion = await this.getGoalsBy(orgId, 'region');
          dashboardData[index].byRegion = byRegion;
        }

        if (data.features.byGeo) {
          const byGeo = await this.getGoalsBy(orgId, 'geo');
          dashboardData[index].byGeo = byGeo;
        }
      }

      if (data.module === 'kpi') {
        if (data.features.byProgress) {
          const byProgress = await this.getKpiByProgress(orgId);
          dashboardData[index].byProgress = byProgress;
        }

        if (data.features.byOwners) {
          const byOwners = await this.getKpiByOwner(orgId);
          dashboardData[index].byOwners = byOwners;
        }
      }

      if (data.module === 'partners') {
        if (data.features.byIndustry) {
          const byIndustry = await this.getPartnersByIndustry(orgId);
          dashboardData[index].byIndustry = byIndustry;
        }

        if (data.features.byPartnerType) {
          const byPartnerType = await this.getPartnersByType(orgId);
          dashboardData[index].byPartnerType = byPartnerType;
        }
      }

      if (data.module === 'scoreCard') {
        if (data.features.byPartner) {
          const byPartner = await this.getScorecardByPartner(orgId);
          dashboardData[index].byPartner = byPartner;
        }

        if (data.features.byCategory) {
          const byCategory = await this.getScorecardByCategory(orgId);
          dashboardData[index].byCategory = byCategory;
        }
      }

      if (data.module === 'project') {
        if (data.features.byOwners) {
          const byOwners = await this.getProjectByOwner(orgId);
          dashboardData[index].byOwners = byOwners;
        }
      }

      index++;
    }

    return dashboardData;
  }

  async getMonthlyOpportunities(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
      TO_CHAR(DATE_TRUNC('month', opportunities.created_at), 'Month') AS month_name,
      DATE_TRUNC('month', opportunities.created_at) AS month,
      CAST(COUNT(opportunities.id) AS NUMERIC ) AS total
      FROM 
          opportunities
      WHERE
          opportunities.origin_organization_id = ${orgId} and EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)

      GROUP BY 
          DATE_TRUNC('month', opportunities.created_at)
      ORDER BY 
          DATE_TRUNC('month', opportunities.created_at)
    `;
    return rawOpportunities;
  }

  async getIndustryOpportunities(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
      industry,
      CAST(COUNT(opportunities.id) AS NUMERIC ) AS total
      FROM 
          opportunities
      LEFT JOIN 
          opportunity_customer
        ON
          opportunities.opportunity_customer_id = opportunity_customer.id
      WHERE
        opportunities.origin_organization_id = ${orgId} and EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY 
          opportunity_customer.industry
      ORDER BY 
          opportunity_customer.industry
    `;
    return rawOpportunities;
  }

  async getCountryOpportunities(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        COALESCE(TRIM(opportunity_customer.country), 'Unknown') AS country,
        CAST(COUNT(opportunities.id) AS NUMERIC ) AS total
      FROM 
        opportunities
      LEFT JOIN 
        opportunity_customer
      ON
        opportunities.opportunity_customer_id = opportunity_customer.id
      WHERE
        opportunities.origin_organization_id = ${orgId} and EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY 
        TRIM(opportunity_customer.country)
      ORDER BY 
        country
    `;
    return rawOpportunities;
  }

  async getCompanyOpportunities(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        organization.company_name,
        CAST(COUNT(opportunities.id) AS NUMERIC ) AS total
      FROM 
        opportunities
      LEFT JOIN 
        organization
      ON
        opportunities.opportunity_receiving_organization_id = organization.id
      WHERE
        opportunities.origin_organization_id = ${orgId} and EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY 
        organization.company_name
      ORDER BY 
        organization.company_name
    `;
    return rawOpportunities;
  }

  async filterOpportunitiesBy(orgId: number, field: string) {
    const allowedFields = ['stage', 'status'];

    if (!allowedFields.includes(field)) {
      throw new Error('Invalid field name');
    }

    const rawOpportunities = await this.prisma.$queryRawUnsafe(`
      SELECT 
        opportunities.${field} AS field,
        CAST(COUNT(opportunities.id) AS NUMERIC ) AS total
      FROM 
        opportunities
      LEFT JOIN 
        organization
      ON
        opportunities.opportunity_receiving_organization_id = organization.id
      WHERE
        opportunities.origin_organization_id = ${orgId} 
        AND EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY 
        opportunities.${field}
      ORDER BY 
        opportunities.${field}
    `);

    return rawOpportunities;
  }

  async getOpportunitiesByUser(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        CONCAT(users.first_name,' ',users.last_name) as full_name,
        CAST(COUNT(opportunities.id) AS NUMERIC ) AS total

      FROM 
        opportunities
      LEFT JOIN 
        users
      ON
        opportunities.opportunity_owner_user_id = users.id
      WHERE
        opportunities.origin_organization_id = ${orgId} and EXTRACT(YEAR FROM opportunities.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY 
        full_name
      ORDER BY 
        full_name
    `;
    return rawOpportunities;
  }

  async getInitiativesByProgress(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        initiatives.progress,
        CAST(COUNT(initiatives.id) AS NUMERIC ) AS total
      FROM 
        initiatives
      LEFT JOIN 
        users
      ON
        users.id = initiatives.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        initiatives.progress
      ORDER BY 
        initiatives.progress
    `;

    return rawOpportunities;
  }

  async getInitiativesByOwner(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        CONCAT(owner.first_name,' ',owner.last_name) as full_name,
        CAST(COUNT(initiatives.id) AS NUMERIC ) AS total
      FROM 
        initiatives
      LEFT JOIN 
        users
      ON
        users.id = initiatives.created_by
      LEFT JOIN 
        users as owner
      ON
        owner.id = initiatives.owner_id
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        full_name
      ORDER BY 
        full_name  
    `;

    return rawOpportunities;
  }

  async getInitiativesCountry(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        initiatives.country,
        CAST(COUNT(initiatives.id) AS NUMERIC ) AS total
      FROM 
        initiatives
      LEFT JOIN 
        users
      ON
        users.id = initiatives.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        initiatives.country
      ORDER BY 
        initiatives.country  
    `;

    return rawOpportunities;
  }

  async getInitiativesBy(orgId: number, field: string) {
    const allowedFields = ['country', 'geo', 'region'];

    if (!allowedFields.includes(field)) {
      throw new Error('Invalid field name');
    }

    const rawOpportunities = await this.prisma.$queryRawUnsafe(`
      SELECT
        initiatives.${field} AS field,
        CAST(COUNT(initiatives.id) AS NUMERIC ) AS total
      FROM 
        initiatives
      LEFT JOIN 
        users
      ON
        users.id = initiatives.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        initiatives.${field}
      ORDER BY 
        initiatives.${field}  
    `);

    return rawOpportunities;
  }

  async getGoalsByProgress(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        goal.start_value as progress,
        CAST(COUNT(goal.id) AS NUMERIC ) AS total
      FROM 
        goal
      LEFT JOIN 
        users
      ON
        users.id = goal.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        progress
      ORDER BY 
        progress
    `;

    return rawOpportunities;
  }

  async getGoalsByOwner(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        CONCAT(owner.first_name,' ',owner.last_name) as full_name,
        CAST(COUNT(goal.id) AS NUMERIC ) AS total
      FROM 
        goal
      LEFT JOIN 
        users
      ON
        users.id = goal.created_by
      LEFT JOIN 
        users as owner
      ON
        owner.id = goal.owner_id
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        full_name
      ORDER BY 
        full_name  
    `;

    return rawOpportunities;
  }

  async getGoalsBy(orgId: number, field: string) {
    const allowedFields = ['country', 'geo', 'region'];

    if (!allowedFields.includes(field)) {
      throw new Error('Invalid field name');
    }

    const rawOpportunities = await this.prisma.$queryRawUnsafe(`
      SELECT
        goal.${field} AS field,
        CAST(COUNT(goal.id) AS NUMERIC ) AS total
      FROM 
        goal
      LEFT JOIN 
        users
      ON
        users.id = goal.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        goal.${field}
      ORDER BY 
        goal.${field}  
    `);

    return rawOpportunities;
  }

  async getKpiByProgress(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        kpi.progress,
        CAST(COUNT(kpi.id) AS NUMERIC ) AS total
      FROM 
      kpi
      LEFT JOIN 
        users
      ON
        users.id = kpi.created_by
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        progress
      ORDER BY 
        progress
    `;

    return rawOpportunities;
  }

  async getKpiByOwner(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        CONCAT(owner.first_name,' ',owner.last_name) as full_name,
        CAST(COUNT(kpi.id) AS NUMERIC ) AS total
      FROM 
      kpi
      LEFT JOIN 
        users
      ON
        users.id = kpi.created_by
      LEFT JOIN 
        users as owner
      ON
        owner.id = kpi.owner_user_id
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        full_name
      ORDER BY 
        full_name  
    `;

    return rawOpportunities;
  }

  async getPartnersByIndustry(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
      COALESCE(organization.industry , 'Unknown') as industry,
      CAST(COUNT(partner.id) AS NUMERIC ) AS total
      FROM 
          partner
      LEFT JOIN 
          organization
        ON
          organization.id = partner.partner_organization_id
      WHERE
          partner.organization_id = ${orgId}
      GROUP BY 
          organization.industry
      ORDER BY 
          organization.industry
    `;
    return rawOpportunities;
  }

  async getPartnersByType(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT partner_type,
      CAST(COUNT(partner.id) AS NUMERIC ) AS total
      FROM 
          partner
      WHERE
          partner.organization_id = ${orgId}
      GROUP BY 
          partner_type
      ORDER BY 
          partner_type
    `;
    return rawOpportunities;
  }

  async getScorecardByPartner(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
    SELECT 
    COALESCE(organization.company_name , 'Unknown') as company_name,
    CAST(COUNT(score_card.id) AS NUMERIC ) AS total
    FROM 
        score_card
    LEFT JOIN 
        organization
      ON
        organization.id = score_card.partner_company
    LEFT JOIN 
        partner
      ON
        partner.id = score_card.partner_id
    WHERE
        partner.organization_id = ${orgId}
    GROUP BY 
        organization.company_name
    ORDER BY 
        organization.company_name
  `;

    return rawOpportunities;
  }

  async getScorecardByCategory(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
    SELECT 
    COALESCE(score_card_category.category , 'Unknown') as category,
    CAST(COUNT(score_card.id) AS NUMERIC ) AS total
    FROM 
        score_card
    LEFT JOIN 
        partner
      ON
        partner.id = score_card.partner_id
    LEFT JOIN 
        score_card_category
      ON
        score_card_category.score_card_id = score_card.id
    WHERE
        partner.organization_id = ${orgId}
    GROUP BY 
        score_card_category.category
    ORDER BY 
        score_card_category.category
  `;

    return rawOpportunities;
  }

  async getProjectByOwner(orgId: number) {
    const rawOpportunities = await this.prisma.$queryRaw`
      SELECT 
        CONCAT(users.first_name,' ',users.last_name) as full_name,
        CAST(COUNT(projects.id) AS NUMERIC ) AS total
      FROM 
        projects
      LEFT JOIN 
        users
      ON
        users.id = projects.owner_id
      WHERE
        users.organization_id = ${orgId}
      GROUP BY 
        full_name
      ORDER BY 
        full_name  
    `;

    return rawOpportunities;
  }
}
