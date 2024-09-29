import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ChimeService } from 'src/shared/services';
import { Public } from 'src/core/decorators';
import { ApiTags } from '@nestjs/swagger';

import {
  AddMemberInChannelDto,
  ChannelDto,
  RemoveMemberInChannelDto,
  SearchDto,
  SendMessageDto,
} from './chat.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chimeService: ChimeService,
  ) {}

  @Post('send-message')
  async createChannel(@Body() message: SendMessageDto, @Req() req) {
    return await this.chatService.sendMessage(message, req.user);
  }

  @Get('channels')
  async getChannels(@Query() channelDto: ChannelDto, @Req() req) {
    return await this.chatService.getChannels(channelDto, req.user.id);
  }

  @Get('channel')
  async searchChannel(@Query() search: SearchDto, @Req() req) {
    return await this.chatService.searchChannel(search, req.user.id);
  }

  @Get()
  async listChannelMessages(@Query() channleDetail: string, @Req() req) {
    return await this.chatService.listChannelMessageByARN(
      channleDetail,
      req.user.id,
    );
  }

  @Patch('channels/add')
  async addNewMemberInChannel(
    @Body() channel: AddMemberInChannelDto,
    @Req() req,
  ) {
    return await this.chatService.addNewMemberInExistingChannel(
      channel,
      req.user,
    );
  }

  @Patch('channels/delete')
  async removeUserFromExistingChannel(
    @Body() channel: RemoveMemberInChannelDto,
    @Req() req,
  ) {
    return await this.chatService.removeUserFromExistingChannel(
      channel,
      req.user,
    );
  }

  @Get('org/user')
  async getAllUser(@Query() search: SearchDto, @Req() req) {
    return await this.chatService.getAllUser(search, req.user.id);
  }

  @Public()
  @Get('create/instance')
  async createAppInstance() {
    return await this.chimeService.createAppInstance();
  }

  @Public()
  @Post('migrate/user')
  async migrateUser(@Body() appInstance: string) {
    return await this.chimeService.migrateUsers(appInstance);
  }

  @Public()
  @Get('add/admin')
  async makeAppInstanceAdmin() {
    return await this.chimeService.makeAppInstanceAdmin();
  }

  @Public()
  @Delete()
  async deleteChannel(@Query() channleDetail: string) {
    return await this.chatService.deleteChannel(channleDetail);
  }
}
