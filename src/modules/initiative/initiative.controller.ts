import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Put,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusType } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { ResponseSuccess } from 'src/utils/response/response';
import { ExportService } from 'src/shared/services';

import { ResponseDTO } from '../auth/auth.dto';
import { AcceptRejectDto } from '../kpi/kpi.dto';
import { AcceptRejectRequestDto } from '../pending_approval_actions/pending_approval_actions.dto';
import { Permissions } from '../../core/decorators/permission.decorator';
import { PartnerPlanService } from '../partner-plan/partner-plan.service';

import {
  CreateInitiativeDto,
  FilterExportInitiativeDto,
  FilterInitiativeDto,
  RemoveTagDto,
  UpdateInitiativeDto,
} from './initiative.dto';
import { InitiativeService } from './initiative.service';

@ApiTags('initiative')
@Controller('initiative')
export class InitiativeController {
  constructor(
    private readonly initiativeService: InitiativeService,
    private exportService: ExportService,
    private partnerPlanService: PartnerPlanService,
  ) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 8 })
  async create(@Req() req, @Body() createInitiativeDto: CreateInitiativeDto) {
    createInitiativeDto.createdBy = req.user.id;
    createInitiativeDto.completionDate = new Date(
      createInitiativeDto.completionDate,
    ).toISOString();
    createInitiativeDto.createdBy = req.user.id;
    const initiative = await this.initiativeService.createInitiativeWithGoal(
      createInitiativeDto,
    );

    return new ResponseSuccess(SUCCESS_MESSAGES.INITIATIVE_CREATED, initiative);
  }

  @Get('filter-initiative')
  @Permissions({ operation: 'read', spaceId: 8 })
  @ApiOperation({ description: 'Filtered initiative list' })
  async findAll(@Query() filterInitiativeDto: FilterInitiativeDto) {
    const orderByObject = {};

    if (filterInitiativeDto.orderBy) {
      orderByObject[filterInitiativeDto.orderBy] = filterInitiativeDto.order;
    }

    const skip = (filterInitiativeDto.page - 1) * filterInitiativeDto.pageSize;
    const take = filterInitiativeDto.pageSize;
    const filterWhere: any = {
      AND: [],
    };

    if (filterInitiativeDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            category: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            industry: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterInitiativeDto.planId) {
      filterWhere.AND.push({ planId: +filterInitiativeDto.planId });
    }

    if (filterInitiativeDto.status) {
      filterWhere.AND.push({ status: filterInitiativeDto.status });
    }

    if (filterInitiativeDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterInitiativeDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [filterWhere],
    };

    const [initiativeList, totalCount] = await Promise.all([
      this.initiativeService.findAll({
        where: whereCond,
        orderBy:
          Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
        skip,
        take,
      }),
      this.initiativeService.count({
        where: whereCond,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / filterInitiativeDto.pageSize);

    return new ResponseSuccess('Initiatives list ', initiativeList, {
      currentPage: filterInitiativeDto.page,
      pageSize: filterInitiativeDto.pageSize,
      totalCount,
      totalPages,
      orderBy: filterInitiativeDto.orderBy,
      order: filterInitiativeDto.order,
    });
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 8 })
  async findOne(@Param('id') id: string) {
    const initiativeDetail = await this.initiativeService.findOne(+id);

    return new ResponseSuccess('Initiative detail ', initiativeDetail);
  }

  @Patch(':id')
  @Permissions({ operation: 'create', spaceId: 8 })
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body() updateInitiativeDto: UpdateInitiativeDto,
  ) {
    const initiativeDetail = await this.initiativeService.update(
      +id,
      req.user.id,
      updateInitiativeDto,
    );

    if (!initiativeDetail.msg) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(initiativeDetail.msg, initiativeDetail.data);
  }

  @Patch('update/:id')
  @Permissions({ operation: 'create', spaceId: 8 })
  async updateInitiative(
    @Param('id') id: string,
    @Req() req,
    @Body() updateInitiativeDto: UpdateInitiativeDto,
  ) {
    const userId = req.user.id;
    const initiativeInfo = await this.initiativeService.findOne(+id);

    if (
      userId !== initiativeInfo.ownerId &&
      userId !== initiativeInfo.createdBy
    ) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'Initiative' },
        HttpStatus.FORBIDDEN,
      );
    }
    updateInitiativeDto.updatedBy = userId;
    if (updateInitiativeDto.tags) {
      updateInitiativeDto.tags =
        initiativeInfo.tags + `,${updateInitiativeDto.tags}`;
    }

    const initiativeDetail = await this.initiativeService.updateInitiative(
      +id,
      updateInitiativeDto,
    );

    return new ResponseSuccess(
      SUCCESS_MESSAGES.INITIATIVE_UPDATED,
      initiativeDetail,
    );
  }

  @Patch('remove-tag/:initiativeId')
  @ApiOperation({ description: 'Remove tag from initiative' })
  async removeTag(
    @Param('initiativeId') initiativeId: string,
    @Req() req,
    @Body() removeTagDto: RemoveTagDto,
  ) {
    const userId = req.user.id;
    const initiativeInfo = await this.initiativeService.findOne(+initiativeId);

    if (
      userId !== initiativeInfo.ownerId &&
      userId !== initiativeInfo.createdBy
    ) {
      throw new HttpException(
        { message: ERROR_MESSAGES.UPDATE_DENIED + 'Initiative' },
        HttpStatus.FORBIDDEN,
      );
    }
    removeTagDto.updatedBy = userId;
    if (removeTagDto.tags) {
      const tagArray = initiativeInfo.tags.split(',');
      const updatedTags = tagArray
        .filter((data) => data != removeTagDto.tags)
        .join(',');
      removeTagDto.tags = updatedTags;
    }

    const initiativeDetail = await this.initiativeService.updateInitiative(
      +initiativeId,
      removeTagDto,
    );

    return new ResponseSuccess(
      SUCCESS_MESSAGES.INITIATIVE_UPDATED,
      initiativeDetail,
    );
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 8 })
  remove(@Param('id') id: string, @Req() req) {
    return this.initiativeService.remove(+id, req.user.id);
  }

  @Put(':id/status')
  @Permissions({ operation: 'create', spaceId: 8 })
  @ApiOperation({
    description: 'Update initiative details status ACCEPT OR REJECT',
  })
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

    const updateStatus = await this.initiativeService.acceptRejectUpdate(
      updateData,
    );

    if (!updateStatus) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(
      'Initiative ' + SUCCESS_MESSAGES.UPDATED_SUCCESS,
    );
  }

  @Get(':planId/export')
  @Permissions({ operation: 'read', spaceId: 8 })
  @ApiOperation({ description: 'Export initiative list' })
  async exportInitiative(
    @Param('planId') planId: string,
    @Query() filterInitiativeDto: FilterExportInitiativeDto,
    @Req() req,
    @Res() res,
  ) {
    const filterWhere: any = {
      AND: [],
    };

    if (filterInitiativeDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            category: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            industry: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              contains: filterInitiativeDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    filterWhere.AND.push({ planId: +planId });

    if (filterInitiativeDto.status) {
      filterWhere.AND.push({ status: filterInitiativeDto.status });
    }

    if (filterInitiativeDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterInitiativeDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [filterWhere],
    };

    const initiativeList = await this.initiativeService.findAll({
      where: whereCond,
      orderBy: { createdAt: 'desc' },
    });

    const planDetail = await this.partnerPlanService.findOne(+planId);

    return this.exportService.exportInitiativesToWord(
      initiativeList,
      planDetail?.name,
      res,
    );
  }
}
