import path from 'path';
import { readFileSync } from 'fs';

import { Injectable, Logger } from '@nestjs/common';
import { GLOBAL_CONFIG } from 'src/configs/global.config';
import * as ics from 'ics';
import { CreateCalendarInviteDto } from 'src/modules/calendar/calendar.dto';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { fromEnv } from '@aws-sdk/credential-providers';
import MailComposer from 'mailcomposer';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  private emailService: SESClient;
  private sourceEmail: string;

  constructor() {
    this.sourceEmail = GLOBAL_CONFIG.app.awsSourceEmail;
    this.emailService = new SESClient({
      region: GLOBAL_CONFIG.app.awsRegion,
      credentials: fromEnv(),
    });
  }

  public async processEmail(
    template: string,
    emails: string[],
    data: any,
    subjectData: string,
    type?: string,
    meetingId?: string,
  ): Promise<void> {
    const templatePath = path.resolve(
      process.cwd(),
      `src/shared/templates/${template}.html`,
    );

    data.aws_s3_url = process.env.AWS_S3_URL;
    const _content = readFileSync(templatePath, 'utf-8');
    // const compiled = _.template(_content);
    // _content = compiled(data);

    const attachments: any[] = [];

    if (type === 'invite' || type === 'cancel') {
      const calendarObj = await this.generateIcsFile(data, type, meetingId);

      if (calendarObj) {
        attachments.push({
          filename: 'invitation.ics',
          content: Buffer.from(calendarObj),
          encoding: 'base64',
          contentType:
            type === 'invite'
              ? 'text/calendar; method=REQUEST'
              : 'text/calendar; method=CANCEL', // Important for Outlook
        });
      }
    }
    const mail = MailComposer({
      from: this.sourceEmail,
      to: emails.join(','),
      subject: subjectData,
      html: _content,
      attachments: attachments,
    });

    mail.build((err, message) => {
      if (err) {
        this.logger.error('Failed to build the email', err);
        return;
      }
      let rawMessage = `From: ${this.sourceEmail}\n`;
      rawMessage += `To: ${emails.join(',')}\n`;
      rawMessage += `Subject: ${subjectData}\n`;

      // Convert the message to a Uint8Array
      const rawMessageData = new TextEncoder().encode(rawMessage + message);

      const params = {
        RawMessage: {
          Data: rawMessageData,
        },
      };

      this.emailService
        .send(new SendRawEmailCommand(params))
        .then(() => {
          this.logger.log(`Email sent successfully to ${emails}`);
        })
        .catch((e) => {
          this.logger.error('Failed to send email', e);
        });
    });
  }

  async generateIcsFile(
    data: CreateCalendarInviteDto,
    type: string,
    meetingId: string,
  ) {
    const startDate = new Date(data.startDateTime);
    const endDate = new Date(data.endDateTime);
    const event: any = {
      start: [
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
      ],
      end: [
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes(),
        endDate.getSeconds(),
      ],
      title: data.title,
      status: type === 'invite' ? 'CONFIRMED' : 'CANCELLED',
      busyStatus: 'BUSY',
      method: type === 'invite' ? 'REQUEST' : 'CANCEL',
      organizer: { name: 'Demo', email: this.sourceEmail },
      attendees: data.requiredCandidates.map((email) => ({
        email: email,
        name: email,
        rsvp: true,
        partstat: 'NEEDS-ACTION', // Indicates that the invitee needs to take action (respond)
        role: 'REQ-PARTICIPANT', // Required participant
      })),
      uid: meetingId,
    };
    const recurrenceRule = this.getRecurrenceRule(
      data.frequency,
      data.customRecurrenceRule,
    );

    if (recurrenceRule) {
      event.recurrenceRule = recurrenceRule;
    }
    const { error, value } = ics.createEvent(event);

    if (value) {
      return value;
    } else {
      this.logger.log(`error ics file ${error.message}`);
      return null;
    }
  }

  private getRecurrenceRule(
    recurrenceType: string,
    customRule?: any,
  ): string | null {
    let rule = '';
    switch (recurrenceType) {
      case 'DOES_NOT_REPEAT':
        return null;
      case 'DAILY':
        rule = 'FREQ=DAILY';
        break;
      case 'WEEKLY':
        rule = 'FREQ=WEEKLY';
        break;
      case 'MONTHLY':
        rule = 'FREQ=MONTHLY';
        break;
      case 'YEARLY':
        rule = 'FREQ=YEARLY';
        break;
      case 'CUSTOM':
        if (customRule) {
          rule = `FREQ=${customRule.frequency.toUpperCase()}`;
          if (customRule.interval) {
            rule += `;INTERVAL=${customRule.interval}`;
          }
          if (customRule.endDate) {
            rule += `;UNTIL=${
              new Date(customRule.endDate)
                .toISOString()
                .replace(/[-:]/g, '')
                .split('.')[0]
            }Z`;
          }
          if (customRule.startDate && customRule.endDate) {
            rule += `;DTSTART=${
              new Date(customRule.startDate)
                .toISOString()
                .replace(/[-:]/g, '')
                .split('.')[0]
            }Z`;
            rule += `;DTEND=${
              new Date(customRule.endDate)
                .toISOString()
                .replace(/[-:]/g, '')
                .split('.')[0]
            }Z`;
          }
        }
        break;
      default:
        this.logger.log(`Unknown recurrence type: ${recurrenceType}`);
        return null;
    }
    return rule;
  }
}
