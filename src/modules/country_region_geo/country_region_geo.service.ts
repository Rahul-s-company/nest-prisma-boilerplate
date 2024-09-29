import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CountryRegionGeoService {
  constructor(private prisma: PrismaService) {}

  findAll(tableName, columns) {
    // Ensure the table name is a valid Prisma model
    if (!this.prisma[tableName]) {
      throw new Error(
        `Table ${tableName} does not exist in the Prisma schema.`,
      );
    }

    // Ensure the columns are valid (optional: additional validation can be added here)

    // Dynamically build the select object
    const select = columns.reduce((acc, column) => {
      acc[column] = true;
      return acc;
    }, {});

    // Dynamically query the table
    return this.prisma[`${tableName}`].findMany({ select });
  }

  remove(id: number) {
    return `This action removes a #${id} countryRegionGeo`;
  }
}
