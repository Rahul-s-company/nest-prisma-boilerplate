import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Prisma, StatusType } from '@prisma/client';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { validate } from 'class-validator';
import { UserRoles } from 'src/types';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';
import { S3Service } from 'src/shared/services';
import {
  opportunityFieldDisplayNames,
  opportunityValidations,
} from 'src/shared/helpers/validation.helper';

import { ResponseDTO } from '../auth/auth.dto';
import { UserRoleService } from '../user-role/user-role.service';
import { Permissions } from '../../core/decorators/permission.decorator';

import { OpportunityService } from './opportunity.service';
import {
  FilterOpportunityDto,
  OpportunityDTO,
  OpportunityInviteDTO,
  UpdateBulkUploadOpportunityDto,
} from './opportunity.dto';

@ApiTags('opportunities')
@Controller('/opportunities')
export class OpportunityController {
  constructor(
    private opportunityService: OpportunityService,
    private userRoleService: UserRoleService,
    private s3Service: S3Service,
  ) {}

  @Get('/')
  @Permissions({ operation: 'read', spaceId: 1 })
  @ApiOperation({ description: 'get opportunity list' })
  async getAllOpportunity(
    @Query() opportunityOrderBy: OrderByAndPaginationDTO,
    @Req() req,
  ): Promise<ResponseDTO> {
    const orderByObject = {};

    if (opportunityOrderBy.orderBy) {
      orderByObject[opportunityOrderBy.orderBy] = opportunityOrderBy.order;
    }

    const skip = (opportunityOrderBy.page - 1) * opportunityOrderBy.pageSize;
    const take = opportunityOrderBy.pageSize;

    const opportunityList = await this.opportunityService.findAll({
      where: {
        OR: [
          { originOrganizationId: req.user.organizationId },
          {
            AND: [
              { opportunityReceivingOrganizationId: req.user.organizationId },
              {
                status: {
                  not: {
                    equals: StatusType.DRAFT,
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy:
        Object.keys(orderByObject).length > 0
          ? orderByObject
          : { createdAt: 'desc' },
      skip,
      take,
    });

    const roleInfo = await this.userRoleService.getUserRoleById(
      req.user.roleId,
    );

    const filteredOpportunity = opportunityList.filter((opportunity) => {
      const isOpportunityOwner =
        opportunity.opportunityOwnerUserId === req.user.id;
      const isOpportunityReceiver =
        opportunity.opportunityReceiverId === req.user.id;

      const isOpportunityAccountManger =
        opportunity.opportunityAccountManagerId === req.user.id;

      const isOpportunityOwnerAccountManger =
        opportunity.opportunityOwnerAccountManagerId === req.user.id;

      const isUserAdminOrLead =
        roleInfo.name === UserRoles.SUPERADMIN ||
        roleInfo.name === UserRoles.LEADERSHIP;

      const showIfOwnerOrAdmin =
        isOpportunityOwner ||
        isOpportunityOwnerAccountManger ||
        isUserAdminOrLead;

      const showIfOpportunityReceiverOrAccountManger =
        isOpportunityReceiver || isOpportunityAccountManger;

      return showIfOwnerOrAdmin || showIfOpportunityReceiverOrAccountManger;
    });

    return new ResponseSuccess('List of opportunity', filteredOpportunity);
  }

  @Get('opportunity/:id')
  @Permissions({ operation: 'read', spaceId: 1 })
  @ApiOperation({ description: 'get opportunity by id' })
  async getOpportunityById(@Param('id') id: string): Promise<ResponseDTO> {
    const opportunity = await this.opportunityService.getOpportunityDetails(
      Number(id),
    );

    let msg = 'opportunity info';

    if (!opportunity) {
      msg = 'No opportunity found';
    }
    return new ResponseSuccess(msg, opportunity);
  }

  @Get('filtered-opportunities')
  @Permissions({ operation: 'read', spaceId: 1 })
  @ApiOperation({ description: 'Filtered opportunity list' })
  async getFilteredOpportunities(
    @Query() filterOpportunityDto: FilterOpportunityDto,
    @Req() req,
  ): Promise<ResponseDTO> {
    const orderByObject = {};

    if (filterOpportunityDto.orderBy) {
      orderByObject[filterOpportunityDto.orderBy] = filterOpportunityDto.order;
    }

    const skip =
      (filterOpportunityDto.page - 1) * filterOpportunityDto.pageSize;
    const take = filterOpportunityDto.pageSize;

    const where: any = {
      OR: [],
      AND: [],
    };

    if (filterOpportunityDto.searchString) {
      where.AND.push({
        OR: [
          {
            opportunity: {
              contains: filterOpportunityDto.searchString,
              mode: 'insensitive',
            },
          },
          {
            opportunityCustomerUser: {
              companyName: {
                contains: filterOpportunityDto.searchString,
                mode: 'insensitive',
              },
            },
          },
          {
            opportunityReceiverOrganization: {
              companyName: {
                contains: filterOpportunityDto.searchString,
                mode: 'insensitive',
              },
            },
          },
          {
            opportunityOriginOrganization: {
              companyName: {
                contains: filterOpportunityDto.searchString,
                mode: 'insensitive',
              },
            },
          },
          {
            uniqueOpportunityId: {
              contains: filterOpportunityDto.searchString,
            },
          },
        ],
      });
    }

    if (filterOpportunityDto.status) {
      where.AND.push({
        status: filterOpportunityDto.status,
      });
    }

    if (filterOpportunityDto.stage) {
      where.AND.push({
        stage: {
          equals: `${filterOpportunityDto.stage}`,
          mode: 'insensitive',
        },
      });
    }

    if (filterOpportunityDto.partnerOrganizationId) {
      where.AND.push({
        OR: [
          {
            opportunityReceivingOrganizationId:
              +filterOpportunityDto.partnerOrganizationId,
          },
          {
            originOrganizationId: +filterOpportunityDto.partnerOrganizationId,
          },
        ],
      });
    }

    if (filterOpportunityDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterOpportunityDto.date),
      );

      where.AND.push({
        createdAt: {
          gte: dateThreshold, // Greater than or equal to dateThreshold
        },
      });
    }

    // If no filter, remove the AND condition
    if (!where.AND) {
      delete where.AND;
    }

    where.OR.push({ originOrganizationId: req.user.organizationId });
    where.OR.push({
      AND: [
        { opportunityReceivingOrganizationId: req.user.organizationId },
        {
          status: {
            not: {
              equals: StatusType.DRAFT,
            },
          },
        },
      ],
    });

    const opportunityList = await this.opportunityService.findAll({
      where,
      orderBy:
        Object.keys(orderByObject).length > 0
          ? orderByObject
          : { createdAt: 'desc' },
      skip,
      take,
    });

    const roleInfo = await this.userRoleService.getUserRoleById(
      req.user.roleId,
    );

    const filteredOpportunity = opportunityList.filter((opportunity) => {
      const isOpportunityOwner =
        opportunity.opportunityOwnerUserId === req.user.id;
      const isOpportunityReceiver =
        opportunity.opportunityReceiverId === req.user.id;

      const isOpportunityAccountManger =
        opportunity.opportunityAccountManagerId === req.user.id;

      const isOpportunityOwnerAccountManger =
        opportunity.opportunityOwnerAccountManagerId === req.user.id;

      const isUserAdminOrLead =
        roleInfo.name === UserRoles.SUPERADMIN ||
        roleInfo.name === UserRoles.LEADERSHIP;

      const showIfOwnerOrAdmin =
        isOpportunityOwner ||
        isOpportunityOwnerAccountManger ||
        isUserAdminOrLead;

      const showIfOpportunityReceiverOrAccountManger =
        isOpportunityReceiver || isOpportunityAccountManger;

      return showIfOwnerOrAdmin || showIfOpportunityReceiverOrAccountManger;
    });

    return new ResponseSuccess(
      'List of filter opportunity',
      filteredOpportunity,
    );
  }

  @Post()
  @Permissions({ operation: 'create', spaceId: 1 })
  @ApiOperation({ description: 'create a opportunity' })
  @ApiBody({ type: OpportunityDTO })
  async createOpportunity(
    @Body() opportunityData: OpportunityDTO,
    @Req() req,
  ): Promise<ResponseDTO> {
    const opportunityResponse = await this.opportunityService.createOpportunity(
      opportunityData,
      req,
    );

    let msg = SUCCESS_MESSAGES.OPPORTUNITY_CREATE;

    if (opportunityResponse.status === 'DRAFT') {
      msg = SUCCESS_MESSAGES.OPPORTUNITY_DRAFT;
    }

    return new ResponseSuccess(msg, opportunityResponse);
  }

  @Put('opportunity/:id/update-invite-status')
  @Permissions({ operation: 'create', spaceId: 1 })
  @ApiOperation({ description: 'Accept or reject opportunity' })
  @ApiBody({ type: OpportunityInviteDTO })
  async updateOpportunityInvite(
    @Param('id') id: string,
    @Body() opportunityInvite: OpportunityInviteDTO,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    opportunityInvite.userId = req.user.id;
    const updateStatus = await this.opportunityService.updateInviteStatus(
      Number(id),
      opportunityInvite,
    );

    if (updateStatus) {
      return new ResponseSuccess(
        `opportunity has been ${updateStatus.status}ED`,
      );
    }

    throw new HttpException(
      {
        message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Put('opportunity/:id/')
  @Permissions({ operation: 'create', spaceId: 1 })
  @ApiBody({ type: OpportunityDTO })
  @ApiOperation({ description: 'update opportunity' })
  async updateOpportunity(
    @Param('id') id: string,
    @Body() data: OpportunityDTO,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    const update = await this.opportunityService.updateOpportunity(
      Number(id),
      data,
      req,
    );

    if (update) {
      let msg = SUCCESS_MESSAGES.OPPORTUNITY_UPDATE;

      if (update.status === 'DRAFT') {
        msg = SUCCESS_MESSAGES.OPPORTUNITY_DRAFT;
      }

      return new ResponseSuccess(msg);
    }

    throw new HttpException(
      {
        message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Delete('opportunity/:id')
  @Permissions({ operation: 'delete', spaceId: 1 })
  @ApiOperation({ description: 'delete opportunity' })
  async deleteOpportunity(
    @Param('id') id: string,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    const delOpportunity = await this.opportunityService.deleteOpportunity(
      Number(id),
      req.user.id,
    );

    if (delOpportunity) {
      return new ResponseSuccess('Opportunity deleted successfully');
    }

    throw new HttpException(
      {
        message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Post('/validate-bulk')
  @ApiOperation({ description: 'validate a bulk opportunity' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `File to upload (CSV or Excel)  [Sample CSV](${process.env.AWS_S3_URL}/bulk_opportunity_sample_v1.csv)`,
        },
      },
    },
  })
  async validateBulkOpportunity(
    @UploadedFile('file') file,
  ): Promise<ResponseDTO | HttpException> {
    if (!file.originalname.endsWith('.csv')) {
      throw new HttpException(
        'Only CSV file is allowed!',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const csvData = file.buffer.toString('utf8');
    const opportunities = await this.opportunityService.parseCsvData(csvData);

    if (!opportunities) {
      throw new HttpException(
        {
          message: `${ERROR_MESSAGES.INVALID_DATA} csv format`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Collect all validation errors
    const errorMessages: string[] = [];

    for (const opportunity of opportunities) {
      const errors = await validate(opportunity);

      if (errors.length > 0) {
        const rowNumber = opportunity.rowNumber;
        const rowErrors = errors.flatMap((error) =>
          Object.values(error.constraints || {}).map(
            () =>
              `Row ${rowNumber}: ${
                opportunityFieldDisplayNames[error.property] || error.property
              } - ${Object.values(error.constraints)
                .join(', ')
                .replace(error.property, '')}`,
          ),
        );
        errorMessages.push(...rowErrors);
      }

      for (const { field, validator, message } of opportunityValidations) {
        const value = opportunity[field];

        if (validator(value)) {
          errorMessages.push(
            `Row ${opportunity.rowNumber}: ${
              opportunityFieldDisplayNames[field] || field
            } - ${message}`,
          );
        }
      }
    }

    if (errorMessages.length > 0) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.OPPORTUNITY_DATA_MISSING,
          error: errorMessages,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess(SUCCESS_MESSAGES.BULK_OPPORTUNITY_VALIDATED);
  }

  @Post('/bulk')
  @Permissions({ operation: 'create', spaceId: 1 })
  @ApiOperation({ description: 'upload a bulk opportunity' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `File to upload (CSV or Excel)  [Sample CSV](${process.env.AWS_S3_URL}/bulk_opportunity_sample_v1.csv)`,
        },
      },
    },
  })
  async createBulkOpportunity(
    @UploadedFile('file') file,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    if (!file.originalname.endsWith('.csv')) {
      throw new HttpException(
        'Only CSV file is allowed!',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const csvData = file.buffer.toString('utf8');
    const opportunities = await this.opportunityService.parseCsvData(csvData);

    // Collect all validation errors
    const errorMessages: string[] = [];

    for (const opportunity of opportunities) {
      const errors = await validate(opportunity);

      if (errors.length > 0) {
        const rowNumber = opportunity.rowNumber;
        const rowErrors = errors.flatMap((error) =>
          Object.values(error.constraints || {}).map(() => `Row ${rowNumber}`),
        );
        errorMessages.push(...rowErrors);
      }
    }

    if (errorMessages.length > 0) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.OPPORTUNITY_DATA_MISSING,
          error: errorMessages,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const opportunityStatus =
      await this.opportunityService.createBulkOpportunity(opportunities, req);

    if (opportunityStatus) {
      return new ResponseSuccess(SUCCESS_MESSAGES.BULK_OPPORTUNITY_CREATE);
    }

    throw new HttpException(
      {
        message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Post('/update-bulk')
  @Permissions({ operation: 'create', spaceId: 1 })
  @ApiOperation({ description: 'update bulk opportunities' })
  @ApiBody({ type: UpdateBulkUploadOpportunityDto })
  async updateBulkOpportunity(
    @Body() updateBulkUploadOpportunityDto: UpdateBulkUploadOpportunityDto,
  ): Promise<ResponseDTO | HttpException> {
    const { opportunityIds, stage } = updateBulkUploadOpportunityDto;

    // Split the opportunityIds string into an array of numbers
    const idArray = opportunityIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10));

    // Create the where condition to check if the opportunity id is in the idArray
    const whereCond: Prisma.OpportunityWhereInput = {
      id: {
        in: idArray,
      },
    };

    // Create the data object for updating
    const updateData: Prisma.OpportunityUncheckedUpdateInput = {
      stage: stage,
    };

    const opportunityStatus =
      await this.opportunityService.updateBulkOpportunity({
        where: whereCond,
        data: updateData,
      });

    if (!opportunityStatus) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (opportunityStatus.count > 0) {
      return new ResponseSuccess(SUCCESS_MESSAGES.BULK_OPPORTUNITY_UPDATE);
    } else {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.NO_OPPORTUNITIES_UPDATED,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('opportunity-stages')
  @ApiOperation({ description: 'get opportunity stages' })
  async getOpportunityStages(): Promise<ResponseDTO> {
    const opportunity = await this.opportunityService.getOpportunityStages();
    return new ResponseSuccess('Opportunity stages list', opportunity);
  }

  @Get('download-bulk-opportunity-sample')
  @ApiOperation({ description: 'download bulk opportunity sample file' })
  async downloadSample(): Promise<ResponseDTO> {
    const url = await this.s3Service.downloadFile(
      'bulk_opportunity_sample_v1.csv',
    );
    return new ResponseSuccess('Bulk opportunity sample file url', { url });
  }
}
