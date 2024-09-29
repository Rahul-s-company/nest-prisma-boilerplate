import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Query,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';

import { Permissions } from '../../core/decorators/permission.decorator';

import { PartnerService } from './partner.service';
import { CreatePartnerDto, UserListDto, UpdatePartnerDto } from './partner.dto';

@ApiTags('partner')
@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 9 })
  @ApiOperation({ description: 'create a partner' })
  @ApiBody({ type: CreatePartnerDto })
  async create(@Body() createPartnerDto: CreatePartnerDto, @Req() req) {
    createPartnerDto.isInvitedBy = req.user.id;
    createPartnerDto.organizationId = req.user.organizationId;
    const partnerInfo = await this.partnerService.create(createPartnerDto);

    if (partnerInfo) {
      return new ResponseSuccess(
        'Partner created Successfully, Registration Email sent ',
      );
    }
  }

  @Put(':id')
  @Permissions({ operation: 'create', spaceId: 9 })
  @ApiOperation({ description: 'update a partner' })
  @ApiBody({ type: UpdatePartnerDto })
  async update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @Req() req,
  ) {
    updatePartnerDto.isInvitedBy = req.user.id;
    const partnerInfo = await this.partnerService.update({
      where: {
        id: Number(id),
      },
      data: updatePartnerDto,
    });

    if (partnerInfo) {
      return new ResponseSuccess('Partner updated Successfully !');
    }
  }

  @Get('my-partner-list')
  @Permissions({ operation: 'read', spaceId: 9 })
  getMyPartnerList(@Req() req) {
    return this.partnerService.findMyPartnerList(
      {
        where: {
          OR: [
            {
              AND: [
                { partnerOrganizationId: req.user.organizationId },
                { status: 'ACTIVE' },
              ],
            },
            { organizationId: req.user.organizationId },
          ],
        },
      },
      req.user.organizationId,
    );
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 9 })
  findOne(@Param('id') id: string) {
    return this.partnerService.findPartnerDetail({
      where: { id: Number(id) },
    });
  }

  @Get(':id/user-list')
  @Permissions({ operation: 'read', spaceId: 9 })
  listPartnerStackholders(
    @Param('id') id: string,
    @Query() userListDto: UserListDto,
    @Req() req,
  ) {
    return this.partnerService.listPartnerStackHolders(
      Number(id),
      req.user.organizationId,
      userListDto.type,
    );
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 9 })
  remove(@Param('id') id: string) {
    return this.partnerService.remove(+id);
  }

  @Get('list/partner-type')
  async getPartnerTypes() {
    const partnerType = await this.partnerService.getPartnerTypes();

    return new ResponseSuccess('partner type lists', partnerType);
  }
}
