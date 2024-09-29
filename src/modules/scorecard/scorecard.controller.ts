import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpException,
  Req,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportService } from 'src/shared/services';

import { ResponseDTO } from '../auth/auth.dto';
import { Permissions } from '../../core/decorators/permission.decorator';

import {
  CreateScorecardDto,
  ScoreCardCategoryFilterDto,
  ScoreCardFilterDto,
  UpdateScoreCardPlanDTO,
  UpdateScorecardDto,
} from './scorecard.dto';
import { ScorecardService } from './scorecard.service';

@ApiTags('scorecard')
@Controller('scorecard')
export class ScorecardController {
  constructor(
    private readonly scorecardService: ScorecardService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 12 })
  async create(
    @Body() createScorecardDto: CreateScorecardDto,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    createScorecardDto.createdBy = req.user.id;

    const scorecardData = await this.scorecardService.createScoreCard(
      createScorecardDto,
    );

    if (!scorecardData) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess('Scorecard created successfully', scorecardData);
  }

  @Get()
  @Permissions({ operation: 'read', spaceId: 12 })
  async findAll(@Query() scoreCardDto: ScoreCardFilterDto) {
    const orderByObject = {};

    if (scoreCardDto.orderBy) {
      orderByObject[scoreCardDto.orderBy] = scoreCardDto.order;
    }

    const filterWhere: any = {
      AND: [],
    };

    if (scoreCardDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (scoreCardDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - scoreCardDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [{ partnerId: +scoreCardDto.partnerId }, filterWhere],
    };

    const scorecardList = await this.scorecardService.findAll({
      where: whereCond,
      orderBy:
        Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
    });

    return new ResponseSuccess('List of score card', scorecardList);
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 12 })
  async findOne(@Param('id') id: string) {
    const scorecardCategoryDetail = await this.scorecardService.findOne(+id);
    return new ResponseSuccess(
      'Scorecard Category Detail',
      scorecardCategoryDetail,
    );
  }

  @Get('score/view-report')
  @Permissions({ operation: 'read', spaceId: 12 })
  async getScoreCardReport(@Query() scoreCardDto: ScoreCardCategoryFilterDto) {
    const orderByObject = {};

    if (scoreCardDto.orderBy) {
      orderByObject[scoreCardDto.orderBy] = scoreCardDto.order;
    }

    const filterWhere: any = {
      AND: [],
    };

    if (scoreCardDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            category: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            requirement: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (scoreCardDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - scoreCardDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    if (scoreCardDto.scoreCardId) {
      filterWhere.AND.push({
        scoreCardId: +scoreCardDto.scoreCardId,
      });
    } else if (scoreCardDto.partnerId) {
      filterWhere.AND.push({
        scoreCard: { partnerId: +scoreCardDto.partnerId },
      });
    } else {
      throw new HttpException(
        {
          message: 'Please either enter score Card Id or Partner Id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const scorecardReportList =
      await this.scorecardService.findAllScoreCardCategoryReport({
        where: filterWhere,
        orderBy:
          Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
      });

    return new ResponseSuccess(
      'List of score card Report',
      scorecardReportList,
    );
  }

  @Get(':partnerId/scorecard-list')
  @Permissions({ operation: 'read', spaceId: 12 })
  @ApiOperation({ description: 'List all scorecard for initiative and goal' })
  async getScoreCardAndCategory(@Param('partnerId') partnerId: string) {
    const whereCond = {
      partnerId: +partnerId,
    };

    const scorecardReportList =
      await this.scorecardService.findAllScoreCardByPartner({
        where: whereCond,
      });

    return new ResponseSuccess(
      'List of score card with category',
      scorecardReportList,
    );
  }

  @Put(':id')
  @Permissions({ operation: 'create', spaceId: 12 })
  update(
    @Param('id') id: string,
    @Body() updateScorecardDto: UpdateScorecardDto,
    @Req() req,
  ) {
    updateScorecardDto.updatedBy = req.user.id;
    return this.scorecardService.update(+id, updateScorecardDto);
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 12 })
  async remove(@Param('id') id: string, @Req() req) {
    const scoreData = await this.scorecardService.remove(+id, req.user.id);

    if (!scoreData) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(SUCCESS_MESSAGES.SCORECARD_REMOVED);
  }

  @Get('score/export-report')
  @Permissions({ operation: 'read', spaceId: 12 })
  async exportScoreCardReport(
    @Query() scoreCardDto: ScoreCardCategoryFilterDto,
    @Res() res,
  ) {
    const orderByObject = {};

    if (scoreCardDto.orderBy) {
      orderByObject[scoreCardDto.orderBy] = scoreCardDto.order;
    }

    const filterWhere: any = {
      AND: [],
    };

    if (scoreCardDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            category: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            requirement: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (scoreCardDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - scoreCardDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    if (scoreCardDto.scoreCardId) {
      filterWhere.AND.push({
        scoreCardId: +scoreCardDto.scoreCardId,
      });
    } else if (scoreCardDto.partnerId) {
      filterWhere.AND.push({
        scoreCard: { partnerId: +scoreCardDto.partnerId },
      });
    } else {
      throw new HttpException(
        {
          message: 'Please either enter score Card Id or Partner Id',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const scorecardReportList =
      await this.scorecardService.findAllScoreCardCategoryReport({
        where: filterWhere,
        orderBy: { createdAt: 'asc' },
      });

    return this.exportService.exportScoreCardCategoryReportToExcel(
      scorecardReportList,
      res,
    );
  }

  @Get('list/export')
  @Permissions({ operation: 'read', spaceId: 12 })
  async exportScoreCard(@Query() scoreCardDto: ScoreCardFilterDto, @Res() res) {
    const orderByObject = {};

    if (scoreCardDto.orderBy) {
      orderByObject[scoreCardDto.orderBy] = scoreCardDto.order;
    }

    const filterWhere: any = {
      AND: [],
    };

    if (scoreCardDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: scoreCardDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (scoreCardDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - scoreCardDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [{ partnerId: +scoreCardDto.partnerId }, filterWhere],
    };

    const scorecardList = await this.scorecardService.findAll({
      where: whereCond,
      orderBy: { createdAt: 'asc' },
    });

    return this.exportService.exportScoreCardToExcel(scorecardList, res);
  }

  @Put(':scoreCardCategoryId/update-score-card')
  @Permissions({ operation: 'create', spaceId: 12 })
  async updateReportCard(
    @Param('scoreCardCategoryId') scoreCardCategoryId: string,
    @Body() updateScorecardDto: UpdateScoreCardPlanDTO,
    @Req() req,
  ) {
    updateScorecardDto.updatedBy = req.user.id;
    updateScorecardDto.id = +scoreCardCategoryId;
    const updatedScoreCard = await this.scorecardService.updateReportCard(
      updateScorecardDto,
    );

    return new ResponseSuccess('Scorecard report updated', updatedScoreCard);
  }
}
