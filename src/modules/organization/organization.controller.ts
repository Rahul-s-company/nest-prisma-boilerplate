import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';

import { OrganizationService } from './organization.service';
import { UpdateOrganizationDTO } from './organization.dto';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  @Put(':id')
  @ApiOperation({ description: 'update organization' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateOrganizationDTO })
  async updateOrganization(
    @Param() params: { id: number },
    @Body() orgData: UpdateOrganizationDTO,
  ) {
    const orgInfo = await this.organizationService.updateOrganization({
      where: { id: Number(params.id) },
      data: orgData,
    });

    if (orgInfo) {
      return new ResponseSuccess('organization updated', orgInfo);
    }

    throw new Error('ORGANIZATION UPDATE ISSUE');
  }

  @Get(':id')
  @ApiOperation({ description: 'get organization detail' })
  @ApiParam({ name: 'id', required: true })
  async getOrganization(@Param() params: { id: number }) {
    const orgInfo = await this.organizationService.findOrganization({
      id: Number(params.id),
    });

    if (orgInfo) {
      return new ResponseSuccess('organization detail', orgInfo);
    }

    throw new Error('ORGANIZATION NOT FOUND');
  }
}
