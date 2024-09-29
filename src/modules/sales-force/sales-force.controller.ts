import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';

import { SalesForceService } from './sales-force.service';
import {
  OpportunityUpdateDto,
  SalesforceStageSyncDTO,
} from './sales-force.dto';

@ApiTags('salesforce')
@Controller('/salesforce')
export class SalesForceController {
  constructor(private readonly salesForceService: SalesForceService) {}

  @Get('opportunity-stages')
  async getOpportunityStages(@Req() req) {
    try {
      const stageList = await this.salesForceService.getOpportunityStageList(
        req.user.id,
      );

      return new ResponseSuccess('List of salesforce stage', stageList);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Get('opportunity-list')
  @ApiOperation({ description: 'get opportunity list from salesforce' })
  async getOpportunityList(@Req() req) {
    try {
      const opportunityList = await this.salesForceService.getOpportunityList(
        req.user.id,
      );
      return new ResponseSuccess('Opportunity List', opportunityList);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Get('opportunity-detail/:id')
  @ApiOperation({ description: 'get opportunity by Id from salesforce' })
  async getOpportunityDetail(@Req() req, @Param('id') id: string) {
    try {
      const detail = await this.salesForceService.getOpportunityDetail(
        req.user.id,
        id,
      );
      return new ResponseSuccess('Opportunity detail', detail);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Post('sync-stages')
  @ApiOperation({ description: 'sync salesforce stages' })
  @ApiBody({ type: SalesforceStageSyncDTO })
  async syncOpportunityStages(
    @Req() req,
    @Body() stageData: SalesforceStageSyncDTO,
  ) {
    try {
      await this.salesForceService.SyncOpportunityStages(
        req.user.id,
        stageData,
      );

      return new ResponseSuccess('salesforce stage synced done !');
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Get('sync-stages')
  @ApiOperation({ description: 'get synced salesforce stages' })
  async getSyncOpportunityStages(@Req() req) {
    try {
      const syncData = await this.salesForceService.GetSyncOpportunityStages(
        req.user.id,
      );

      if (syncData) {
        return new ResponseSuccess('salesforce synced stages !', syncData);
      } else {
        throw new HttpException(
          {
            message: 'No data found',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Put('opportunity-update/:id')
  @ApiBody({ type: OpportunityUpdateDto })
  async updateSalesforceOpportunity(
    @Req() req,
    @Param('id') id: string,
    @Body() updatedData: OpportunityUpdateDto,
  ) {
    const updateData = await this.salesForceService.updateSalesforceOpportunity(
      req.user.id,
      id,
      updatedData,
    );

    if (updateData) {
      return new ResponseSuccess('salesforce opportunity updated !');
    }
  }
}
