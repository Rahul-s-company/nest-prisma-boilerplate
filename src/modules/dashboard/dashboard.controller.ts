import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';

import { DashboardService } from './dashboard.service';
import { CreateDashboardDto, UpdateDashboardDto } from './dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  @ApiOperation({ description: 'Create a dashboard config' })
  @ApiBody({ type: CreateDashboardDto })
  async create(@Req() req, @Body() createDashboardDto: CreateDashboardDto) {
    createDashboardDto.createdBy = req.user.id;
    createDashboardDto.userId = req.user.id;

    const dashboardInfo = await this.dashboardService.create(
      createDashboardDto,
    );
    return new ResponseSuccess(
      'dashboard config created successfully !',
      dashboardInfo,
    );
  }

  @Get(':userId')
  async findOne(@Param('userId') userId: string) {
    const dashboardInfo = await this.dashboardService.findOne(+userId);

    return new ResponseSuccess('dashboard config info !', dashboardInfo);
  }

  @Patch(':userId')
  async update(
    @Param('userId') userId: string,
    @Req() req,
    @Body() updateDashboardDto: UpdateDashboardDto,
  ) {
    if (+userId !== req.user.id) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.UPDATE_DENIED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    updateDashboardDto.updatedBy = req.user.id;
    const dashboardInfo = await this.dashboardService.update(
      updateDashboardDto,
      +userId,
    );

    if (!dashboardInfo) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess(
      'dashboard config updated successfully !',
      dashboardInfo,
    );
  }

  @Get(':userId/getDashboard')
  async getDashboard(@Param('userId') userId: string, @Req() req) {
    const dashboardDetail = await this.dashboardService.createDashboard(
      +userId,
      req.user.organizationId,
    );

    return new ResponseSuccess('dashboard details !', dashboardDetail);
  }
}
