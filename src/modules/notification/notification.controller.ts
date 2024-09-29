import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';

import { Permissions } from '../../core/decorators/permission.decorator';

import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './notification.dto';

@ApiTags('notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('/')
  @Permissions({ operation: 'create', spaceId: 19 })
  @ApiOperation({ description: 'Create a notification' })
  @ApiBody({ type: CreateNotificationDto })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get('/')
  @Permissions({ operation: 'read', spaceId: 19 })
  async findAll(@Req() req) {
    const notificationList = await this.notificationService.findAll({
      where: { userId: req.user.id },
    });

    return new ResponseSuccess('Notification Lists', notificationList);
  }

  @Get('/count/unread')
  @ApiOperation({ description: 'get count of unread notification' })
  async getUnreadCount(@Req() req) {
    const notificationCount =
      await this.notificationService.getNotificationCount({
        userId: req.user.id,
        isRead: false,
      });

    return new ResponseSuccess('Notification Count', {
      count: notificationCount,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const notificationInfo = await this.notificationService.findOne(+id);

    return new ResponseSuccess('Notification Details', notificationInfo);
  }

  @Patch('/')
  @Permissions({ operation: 'create', spaceId: 19 })
  async update(@Req() req, @Body() data: UpdateNotificationDto) {
    const notificationData = await this.notificationService.updateNotifications(
      {
        userId: req.user.id,
        id: { in: data.notificationIds.split(',').map(Number) },
      },
      {
        isRead: true,
        isReadBy: req.user.id,
      },
    );

    return new ResponseSuccess('Notification Updated', notificationData);
  }

  @Delete('/:notificationIds')
  @Permissions({ operation: 'delete', spaceId: 19 })
  @ApiOperation({ description: 'Delete multiple notifications' })
  @ApiParam({ name: 'notificationIds', required: true, example: '1,21,3' })
  async remove(@Param('notificationIds') notificationIds: string, @Req() req) {
    const notificationDelete =
      await this.notificationService.deleteNotifications({
        userId: req.user.id,
        id: { in: notificationIds.split(',').map(Number) },
      });

    return new ResponseSuccess('Notification Deleted', notificationDelete);
  }
}
