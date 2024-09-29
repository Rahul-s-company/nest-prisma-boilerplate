import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Req,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { PendingApprovalService } from './pending_approval_actions.service';
import { actionDto } from './pending_approval_actions.dto';

@ApiTags('pending_approval_actions')
@Controller('PendingApprovalActions')
export class PendingApprovalController {
  constructor(
    private readonly pendingApprovalService: PendingApprovalService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pendingApprovalService.findOne(+id);
  }

  @Post()
  @ApiBody({ type: actionDto })
  update(@Req() req, @Body() data: actionDto) {
    return this.pendingApprovalService.upsert(data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pendingApprovalService.remove(+id);
  }
}
