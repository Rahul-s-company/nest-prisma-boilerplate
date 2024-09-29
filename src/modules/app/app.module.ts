import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService, TaskService } from 'src/shared/services';
import { PermissionService } from 'src/shared/services/permission.service';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { RedisModule } from '@nestjs-modules/ioredis';

import { UserModule } from '../user/user.module';
import { OpportunityModule } from '../opportunity/opportunity.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GLOBAL_CONFIG } from '../../configs/global.config';
import { LoggerModule } from '../logger/logger.module';
import { LoggerMiddleware } from '../../middlewares/logger.middleware';
import { CountryRegionGeoModule } from '../country_region_geo/country_region_geo.module';
import { IndustryModule } from '../industry/industry.module';
import { SalesForceModule } from '../sales-force/sales-force.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { SpacesModule } from '../spaces/spaces.module';
import { PartnerModule } from '../partner/partner.module';
import { KpiModule } from '../kpi/kpi.module';
import { PendingApprovalModule } from '../pending_approval_actions/pending_approval_actions.module';
import { NotificationModule } from '../notification/notification.module';
import { PartnerPlanModule } from '../partner-plan/partner-plan.module';
import { InitiativeModule } from '../initiative/initiative.module';
import { GoalModule } from '../goal/goal.module';
import { CategoryModule } from '../category/category.module';
import { AssetModule } from '../asset/asset.module';
import { ScorecardModule } from '../scorecard/scorecard.module';
import { ProjectModule } from '../project/project.module';
import { CalendarModule } from '../calendar/calendar.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ChatModule } from '../chat/chat.module';
import { OrganizationModule } from '../organization/organization.module';
import { SalesForceService } from '../sales-force/sales-force.service';

import { AppService } from './app.service';
import { AppController } from './app.controller';
@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    AuthModule,
    UserModule,
    UserRoleModule,
    OpportunityModule,
    OrganizationModule,
    KpiModule,
    CountryRegionGeoModule,
    IndustryModule,
    SalesForceModule,
    PartnerModule,
    SpacesModule,
    PendingApprovalModule,
    NotificationModule,
    PartnerPlanModule,
    InitiativeModule,
    GoalModule,
    CategoryModule,
    AssetModule,
    ScorecardModule,
    ProjectModule,
    CalendarModule,
    DashboardModule,
    ChatModule,
    ConfigModule.forRoot({ isGlobal: true, load: [() => GLOBAL_CONFIG] }),
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads', // Specify your upload destination
    }),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailService,
    TaskService,
    PermissionService,
    SalesForceService,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
