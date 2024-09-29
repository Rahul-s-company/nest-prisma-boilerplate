import { Prisma, Organization } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findOrganization(
    organizationWhereUniqueInput: Prisma.OrganizationWhereInput,
  ): Promise<Organization> {
    return this.prisma.organization.findFirst({
      where: organizationWhereUniqueInput,
    });
  }

  async listOrganization(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.OrganizationWhereUniqueInput;
    where?: Prisma.OrganizationWhereInput;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
  }): Promise<Organization[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.organization.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createOrganization(
    data: Prisma.OrganizationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Organization> {
    const prisma = tx || this.prisma;

    return await prisma.organization.create({
      data,
    });
  }

  async updateOrganization(params: {
    where: Prisma.OrganizationWhereUniqueInput;
    data: Prisma.OrganizationUpdateInput;
  }): Promise<Organization> {
    const { where, data } = params;
    return this.prisma.organization.update({
      data,
      where,
    });
  }

  public async upsertOrg(orgData: any) {
    const orgDetail = await this.findOrganization({
      salesforceOrgId: orgData.salesforceOrgId,
    });
    let updatedData;

    if (orgDetail) {
      //update organization
      updatedData = await this.updateOrganization({
        where: {
          id: orgDetail.id,
        },
        data: orgData,
      });
    } else {
      //create organization
      updatedData = await this.createOrganization(orgData);
    }
    return updatedData;
  }
}
