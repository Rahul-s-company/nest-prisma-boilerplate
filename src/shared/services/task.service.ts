import { Injectable, Logger, Scope } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OpportunityService } from 'src/modules/opportunity/opportunity.service';

@Injectable({ scope: Scope.DEFAULT })
export class TaskService {
  constructor(private opportunityService: OpportunityService) {}
  private logger = new Logger(TaskService.name);
  /**
   * Cron run at every 45 seconds
   */
  @Cron('0 0 * * * *')
  handleCron() {
    this.logger.log('Called when at 12 midnight');
  }

  @Cron('0 0 * * * *', {
    name: 'notifications',
    timeZone: 'America/New_York',
  })
  triggerNotifications() {
    this.logger.log('Called when at 12 in american timezone');
    // this.opportunityService.fetchOpportunityAlertAndSentNotification();
  }
}
