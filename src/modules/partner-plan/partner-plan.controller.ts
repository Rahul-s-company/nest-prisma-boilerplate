import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ExportService } from 'src/shared/services/export.service';
import { SUCCESS_MESSAGES } from 'src/shared/constants/strings';

import { Permissions } from '../../core/decorators/permission.decorator';

import { PartnerPlanService } from './partner-plan.service';
import {
  CreatePartnerPlanDto,
  FilterPlanDto,
  UpdatePartnerPlanDto,
} from './partner-plan.dto';

@ApiTags('partner-plan')
@Controller('partner-plan')
export class PartnerPlanController {
  constructor(
    private readonly partnerPlanService: PartnerPlanService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 5 })
  async create(@Req() req, @Body() createPartnerPlanDto: CreatePartnerPlanDto) {
    createPartnerPlanDto.planOverview.organizationId = req.user.organizationId;

    const partnerPlan = await this.partnerPlanService.createPartnerPlan(
      req.user.id,
      createPartnerPlanDto,
    );

    return new ResponseSuccess(SUCCESS_MESSAGES.PLAN_CREATED, partnerPlan);
  }

  @Get(':partnerId')
  @Permissions({ operation: 'read', spaceId: 5 })
  async findAll(
    @Query() filterPlanDto: FilterPlanDto,
    @Req() req,
    @Param('partnerId') partnerId: string,
  ) {
    const orderByObject = {};

    if (filterPlanDto.orderBy) {
      orderByObject[filterPlanDto.orderBy] = filterPlanDto.order;
    }

    const skip = (filterPlanDto.page - 1) * filterPlanDto.pageSize;
    const take = filterPlanDto.pageSize;
    const filterWhere: any = {
      AND: [],
    };

    if (filterPlanDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterPlanDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterPlanDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterPlanDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [
        {
          OR: [
            {
              partner: {
                partnerOrganizationId: req.user.organizationId,
              },
            },
            {
              AND: [
                {
                  organizationId: req.user.organizationId,
                  partnerId: +partnerId,
                },
              ],
            },
            {
              AND: [
                {
                  partner: {
                    organizationId: req.user.organizationId,
                  },
                  partnerId: +partnerId,
                },
              ],
            },
          ],
        },
        filterWhere,
      ],
    };

    const [partnerPlanList, totalCount] = await Promise.all([
      this.partnerPlanService.findAll(
        {
          where: whereCond,
          orderBy:
            Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
          skip,
          take,
        },
        req.user.organizationId,
      ),
      this.partnerPlanService.count({
        where: whereCond,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / filterPlanDto.pageSize);

    return new ResponseSuccess('Partner plans List ', partnerPlanList, {
      currentPage: filterPlanDto.page,
      pageSize: filterPlanDto.pageSize,
      totalCount,
      totalPages,
      orderBy: filterPlanDto.orderBy,
      order: filterPlanDto.order,
    });
  }

  @Get('detail/:id')
  @Permissions({ operation: 'read', spaceId: 5 })
  async findOne(@Param('id') id: string) {
    const partnerPlanInfo = await this.partnerPlanService.findOne(+id);

    return new ResponseSuccess('Partner plan Detail', partnerPlanInfo);
  }

  @Patch(':id')
  @Permissions({ operation: 'create', spaceId: 5 })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePartnerPlanDto: UpdatePartnerPlanDto,
  ) {
    const partnerPlanInfo = await this.partnerPlanService.update(
      +id,
      req.user.id,
      updatePartnerPlanDto,
    );

    return new ResponseSuccess(SUCCESS_MESSAGES.PLAN_UPDATED, partnerPlanInfo);
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 5 })
  async remove(@Param('id') id: string, @Req() req) {
    const partnerPlanInfo = await this.partnerPlanService.remove(
      +id,
      req.user.id,
    );
    return new ResponseSuccess(SUCCESS_MESSAGES.PLAN_DELETE, partnerPlanInfo);
  }

  @Get(':partnerId/export')
  @Permissions({ operation: 'read', spaceId: 5 })
  async exportPlans(
    @Query('format') format: 'ppt' | 'docx',
    @Param('partnerId') partnerId: string,
    @Req() req,
    @Res() res,
  ) {
    // Fetch the data
    const whereCond = {
      AND: [
        {
          OR: [
            {
              partner: {
                partnerOrganizationId: req.user.organizationId,
              },
            },
            {
              AND: [
                {
                  organizationId: req.user.organizationId,
                  partnerId: +partnerId,
                },
              ],
            },
            {
              AND: [
                {
                  partner: {
                    organizationId: req.user.organizationId,
                  },
                  partnerId: +partnerId,
                },
              ],
            },
          ],
        },
      ],
    };

    const partnerPlans = await this.partnerPlanService.findPlanForExport({
      where: whereCond,
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'ppt') {
      return this.exportService.exportToPpt(partnerPlans, res);
    } else if (format === 'docx') {
      return this.exportService.exportToWord(partnerPlans, res);
    }
    // return partnerPlans;
  }
}
