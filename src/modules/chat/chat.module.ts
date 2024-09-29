import { Module } from '@nestjs/common';
import { ChimeService } from 'src/shared/services';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from 'src/shared/constants/global.constants';

import { PrismaService } from '../prisma/prisma.service';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chatgatway';

@Module({
  controllers: [ChatController],
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
    }),
  ],
  providers: [
    ChatService,
    PrismaService,
    ChimeService,
    ChatGateway,
    JwtService,
  ],
})
export class ChatModule {}
