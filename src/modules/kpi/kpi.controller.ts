import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Req,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { StatusType } from '@prisma/client';

import { ResponseDTO } from '../auth/auth.dto';
import { AcceptRejectRequestDto } from '../pending_approval_actions/pending_approval_actions.dto';
import { Permissions } from '../../core/decorators/permission.decorator';

import {
  AcceptRejectDto,
  CreateKpiDto,
  FilterKpiDto,
  UpdateKpiDto,
} from './kpi.dto';
import { KpiService } from './kpi.service';

@ApiTags('kpi')
@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Post('/')
  @Permissions({ operation: 'create', spaceId: 2 })
  @ApiOperation({ description: 'Create a new Kpi' })
  @ApiBody({ type: CreateKpiDto })
  async create(
    @Req() req,
    @Body() createKpiDto: CreateKpiDto,
  ): Promise<ResponseDTO | HttpException> {
    createKpiDto.createdBy = req.user.id;
    createKpiDto.organizationId = req.user.organizationId;

    const KpiData = await this.kpiService.create(createKpiDto);

    if (!KpiData) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess('Kpi created successfully !');
  }

  @Get('/')
  @Permissions({ operation: 'read', spaceId: 2 })
  @ApiOperation({ description: 'List all Kpi' })
  async findAll(@Query() filterKpiDto: FilterKpiDto, @Req() req) {
    const orderByObject = {};

    if (filterKpiDto.orderBy) {
      orderByObject[filterKpiDto.orderBy] = filterKpiDto.order;
    }

    const skip = (filterKpiDto.page - 1) * filterKpiDto.pageSize;
    const take = filterKpiDto.pageSize;

    const filterWhere: any = {
      AND: [],
    };

    if (filterKpiDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterKpiDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterKpiDto.status) {
      filterWhere.AND.push({ status: filterKpiDto.status });
    }

    if (filterKpiDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterKpiDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    let whereCond = {
      AND: [
        {
          OR: [
            {
              ownerUserId: req.user.id,
            },
            {
              createdBy: req.user.id,
            },
          ],
        },
        filterWhere,
      ],
    };

    if (filterKpiDto.kpiType === 'My kpi') {
      whereCond = {
        AND: [
          {
            ownerUserId: req.user.id,
          },
          filterWhere,
        ],
      };
    }

    const [kpiList, totalCount] = await Promise.all([
      this.kpiService.findAll({
        where: whereCond,
        orderBy:
          Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
        skip,
        take,
      }),
      this.kpiService.count({
        where: whereCond,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / filterKpiDto.pageSize);

    return new ResponseSuccess('Kpi Lists', kpiList, {
      currentPage: filterKpiDto.page,
      pageSize: filterKpiDto.pageSize,
      totalCount,
      totalPages,
      orderBy: filterKpiDto.orderBy,
      order: filterKpiDto.order,
    });
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 2 })
  @ApiOperation({ description: 'Get Kpi details by id' })
  async findOne(@Param('id') id: string): Promise<ResponseDTO | HttpException> {
    const kpiInfo = await this.kpiService.findOne(+id);

    return new ResponseSuccess('Kpi Details', kpiInfo);
  }

  @Patch(':id')
  @Permissions({ operation: 'create', spaceId: 2 })
  @ApiOperation({ description: 'update kpi' })
  @ApiBody({ type: UpdateKpiDto })
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body() updateKpiDto: UpdateKpiDto,
  ) {
    const updatedResponse = await this.kpiService.update(
      +id,
      req.user.id,
      updateKpiDto,
    );

    if (!updatedResponse.msg) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(updatedResponse.msg, updatedResponse.data);
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 2 })
  @ApiOperation({ description: 'Remove kpi' })
  async remove(
    @Param('id') id: string,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    const kpiData = await this.kpiService.remove(+id, req.user.id);

    if (!kpiData) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(SUCCESS_MESSAGES.KPI_REMOVED);
  }

  @Put(':id/status')
  @Permissions({ operation: 'create', spaceId: 2 })
  @ApiOperation({ description: 'Update kpi details status ACCEPT OR REJECT' })
  @ApiBody({ type: AcceptRejectRequestDto })
  async acceptRejectKpiUpdate(
    @Param('id') id: string,
    @Body() acceptRejectReqDto: AcceptRejectRequestDto,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    const updateData: AcceptRejectDto = {
      id: +id,
      status: acceptRejectReqDto.status,
      userId: req.user.id,
    };

    if (acceptRejectReqDto.status === StatusType.REJECT) {
      updateData.reason = acceptRejectReqDto.reason;
    }

    const updateKpiStatus = await this.kpiService.acceptRejectKpiUpdate(
      updateData,
    );

    if (!updateKpiStatus) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(SUCCESS_MESSAGES.KPI_UPDATED);
  }
}
