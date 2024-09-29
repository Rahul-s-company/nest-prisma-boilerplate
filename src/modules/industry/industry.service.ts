import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IndustryService {
  constructor(private prisma: PrismaService) {}

  // create(createIndustryDto: CreateIndustryDto) {
  //   return 'This action adds a new industry';
  // }

  findAll() {
    return this.prisma.industry.findMany();
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} industry`;
  // }

  // update(id: number, updateIndustryDto: UpdateIndustryDto) {
  //   return `This action updates a #${id} industry`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} industry`;
  // }
}
