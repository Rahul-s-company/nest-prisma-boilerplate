import { Module } from '@nestjs/common';
import { EmailService } from 'src/shared/services';

import { PrismaService } from '../prisma/prisma.service';

import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService, EmailService],
})
export class CalendarModule {}
