import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CalendarService } from './calendar.service';
import { CreateCalendarInviteDto, DateRangeDto } from './calendar.dto';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Post('add')
  async createMeeting(
    @Req() req,
    @Body() createInviteDto: CreateCalendarInviteDto,
  ) {
    createInviteDto.createdBy = req.user.id;
    return await this.calendarService.createCalendarInvite(createInviteDto);
  }

  @Get('get')
  async getMeeting(@Query() range: DateRangeDto) {
    const { startDate, endDate, partnerId } = range;

    // Ensure dates are in proper format
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await this.calendarService.getMeeting({
      startDate: start,
      endDate: end,
      partnerId: partnerId,
    });
  }

  @Delete(':id')
  async cancelMeeting(@Param('id') id: string) {
    return await this.calendarService.cancelMeeting(+id);
  }

  @Patch(':id')
  async updateMeeting(
    @Param('id') id: string,
    @Req() req,
    @Body() updateInviteDto: CreateCalendarInviteDto,
  ) {
    updateInviteDto.updatedBy = req.user.id;
    return await this.calendarService.updateMeeting(+id, updateInviteDto);
  }

  @Get(':id')
  async getSingleMeeting(@Param('id') id: string) {
    return await this.calendarService.getSingleMeeting(+id);
  }
}
