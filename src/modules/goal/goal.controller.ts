import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpStatus,
  HttpException,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { StatusType } from '@prisma/client';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportService } from 'src/shared/services';

import { ResponseDTO } from '../auth/auth.dto';
import { AcceptRejectRequestDto } from '../pending_approval_actions/pending_approval_actions.dto';
import { AcceptRejectDto } from '../kpi/kpi.dto';
import { FilterExportInitiativeDto } from '../initiative/initiative.dto';
import { Permissions } from '../../core/decorators/permission.decorator';

import { CreateGoalDto, FilterGoalDto, UpdateGoalDto } from './goal.dto';
import { GoalService } from './goal.service';

@ApiTags('goal')
@Controller('goal')
export class GoalController {
  constructor(
    private readonly goalService: GoalService,
    private exportService: ExportService,
  ) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 6 })
  async create(@Req() req, @Body() createGoalDto: CreateGoalDto) {
    createGoalDto.createdBy = req.user.id;
    createGoalDto.completionDate = new Date(
      createGoalDto.completionDate,
    ).toISOString();

    const goalInfo = await this.goalService.createGoalIndividual(createGoalDto);

    if (!goalInfo) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(SUCCESS_MESSAGES.GOAL_CREATED, goalInfo);
  }

  @Get('filter-goal')
  @Permissions({ operation: 'read', spaceId: 6 })
  async findAll(@Query() filterGoalDto: FilterGoalDto) {
    const orderByObject = {};

    if (filterGoalDto.orderBy) {
      orderByObject[filterGoalDto.orderBy] = filterGoalDto.order;
    }

    const skip = (filterGoalDto.page - 1) * filterGoalDto.pageSize;
    const take = filterGoalDto.pageSize;
    const filterWhere: any = {
      AND: [],
    };

    if (filterGoalDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            industry: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterGoalDto.planId) {
      filterWhere.AND.push({ planId: +filterGoalDto.planId });
    }

    if (filterGoalDto.status) {
      filterWhere.AND.push({ status: filterGoalDto.status });
    }

    if (filterGoalDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterGoalDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [filterWhere],
    };

    const [goalList, totalCount] = await Promise.all([
      this.goalService.findAll({
        where: whereCond,
        orderBy:
          Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
        skip,
        take,
      }),
      this.goalService.count({
        where: whereCond,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / filterGoalDto.pageSize);

    return new ResponseSuccess('Goals list ', goalList, {
      currentPage: filterGoalDto.page,
      pageSize: filterGoalDto.pageSize,
      totalCount,
      totalPages,
      orderBy: filterGoalDto.orderBy,
      order: filterGoalDto.order,
    });
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 6 })
  async findOne(@Param('id') id: string) {
    const goalDetail = await this.goalService.findOne(+id);

    return new ResponseSuccess('Goal detail ', goalDetail);
  }

  @Patch(':id')
  @Permissions({ operation: 'create', spaceId: 6 })
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    const goalDetail = await this.goalService.update(
      +id,
      req.user.id,
      updateGoalDto,
    );

    if (!goalDetail.msg) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(goalDetail.msg, goalDetail.data);
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 6 })
  remove(@Param('id') id: string, @Req() req) {
    return this.goalService.remove(+id, req.user.id);
  }

  @Put(':id/status')
  @Permissions({ operation: 'create', spaceId: 6 })
  @ApiOperation({ description: 'Update goal details status ACCEPT OR REJECT' })
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
    const updateStatus = await this.goalService.acceptRejectUpdate(updateData);

    if (!updateStatus) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess('Goal' + SUCCESS_MESSAGES.UPDATED_SUCCESS);
  }

  @Get(':planId/export')
  @Permissions({ operation: 'read', spaceId: 6 })
  @ApiOperation({ description: 'Export goal list' })
  async exportGoal(
    @Param('planId') planId: string,
    @Query() filterGoalDto: FilterExportInitiativeDto,
    @Req() req,
    @Res() res,
  ) {
    const filterWhere: any = {
      AND: [],
    };

    if (filterGoalDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            industry: {
              contains: filterGoalDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    filterWhere.AND.push({ planId: +planId });

    if (filterGoalDto.status) {
      filterWhere.AND.push({ status: filterGoalDto.status });
    }

    if (filterGoalDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterGoalDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [filterWhere],
    };

    const goalList = await this.goalService.findAll({
      where: whereCond,
      orderBy: { createdAt: 'desc' },
    });

    return this.exportService.exportGoalsToWord(goalList, planId, res);
  }
}
