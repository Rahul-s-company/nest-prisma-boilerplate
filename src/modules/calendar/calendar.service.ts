import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EmailService } from 'src/shared/services';
import {
  EMAIL_SUBJECTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/shared/constants/strings';
import { ResponseSuccess } from 'src/utils/response/response';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  areIntervalsOverlapping,
} from 'date-fns'; // Using date-fns for date manipulations

import { PrismaService } from '../prisma/prisma.service';

import { CreateCalendarInviteDto, DateRangeDto } from './calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createCalendarInvite(data: CreateCalendarInviteDto): Promise<any> {
    if (new Date(data.startDateTime) >= new Date(data.endDateTime)) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.START_DATE_END_DATE_VALIDATION,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (data.frequency === 'CUSTOM') {
      if (
        new Date(data?.customRecurrenceRule?.startDate) >
        new Date(data?.customRecurrenceRule?.endDate)
      ) {
        throw new HttpException(
          {
            message: ERROR_MESSAGES.START_DATE_END_DATE_FOR_CUSTOM_VALIDATION,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }
    try {
      const meetingCreated = await this.prisma.calendar.create({ data });
      await this.emailService.processEmail(
        'welcome',
        data.requiredCandidates,
        data,
        EMAIL_SUBJECTS.CALENDAR_INVITE,
        'invite',
        String(meetingCreated.id),
      );
      return new ResponseSuccess(SUCCESS_MESSAGES.MEETING_CREATED);
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMeeting(range: DateRangeDto): Promise<any> {
    try {
      const { startDate, endDate, partnerId } = range;

      // Fetch all meetings that either fall in the range or have a frequency
      const meetings = await this.prisma.calendar.findMany({
        where: {
          partnerId: +partnerId,
          OR: [
            {
              startDateTime: {
                gte: startDate,
                lte: endDate,
              },
            },
            // For recurring meetings, include based on their frequency type
            {
              frequency: 'MONTHLY', // Handle monthly recurrence
            },
            {
              frequency: 'WEEKLY', // Handle weekly recurrence
            },
            {
              frequency: 'YEARLY', // Handle yearly recurrence
            },
            {
              frequency: 'DAILY', // Handle daily recurrence
            },
            {
              frequency: 'CUSTOM', // Handle daily recurrence
            },
            {
              frequency: 'DOES_NOT_REPEAT', // Handle does not repeat recurrence
            },
          ],
        },
        orderBy: {
          startDateTime: 'asc',
        },
      });

      // Now handle the recurrence logic manually
      const filteredMeetings = meetings.filter((meeting) => {
        const {
          startDateTime,
          endDateTime,
          frequency,
          customRecurrenceRule,
        }: any = meeting;
        let occurrenceStartDate = new Date(startDateTime);
        let occurrenceEndDate = new Date(endDateTime);

        const isOccurrenceInRange = (
          occurrenceStart: Date,
          occurrenceEnd: Date,
        ) => {
          return areIntervalsOverlapping(
            { start: occurrenceStart, end: occurrenceEnd }, // Occurrence interval
            { start: startDate, end: endDate }, // Query date range interval
          );
        };

        if (!frequency) {
          // If there's no recurrence frequency, just return it as-is
          return true;
        }
        // Handle recurrence types
        if (frequency === 'MONTHLY') {
          while (occurrenceStartDate <= endDate) {
            if (isOccurrenceInRange(occurrenceStartDate, occurrenceEndDate)) {
              return true;
            }
            occurrenceStartDate = addMonths(occurrenceStartDate, 1);
            occurrenceEndDate = addMonths(occurrenceEndDate, 1);
          }
        } else if (frequency === 'WEEKLY') {
          while (occurrenceStartDate <= endDate) {
            if (isOccurrenceInRange(occurrenceStartDate, occurrenceEndDate)) {
              return true;
            }
            occurrenceStartDate = addWeeks(occurrenceStartDate, 1);
            occurrenceEndDate = addWeeks(occurrenceEndDate, 1);
          }
        } else if (frequency === 'YEARLY') {
          while (occurrenceStartDate <= endDate) {
            if (isOccurrenceInRange(occurrenceStartDate, occurrenceEndDate)) {
              return true;
            }
            occurrenceStartDate = addYears(occurrenceStartDate, 1);
            occurrenceEndDate = addYears(occurrenceEndDate, 1);
          }
        } else if (frequency === 'DAILY') {
          while (occurrenceStartDate <= endDate) {
            if (isOccurrenceInRange(occurrenceStartDate, occurrenceEndDate)) {
              return true;
            }
            occurrenceStartDate = addDays(occurrenceStartDate, 1);
            occurrenceEndDate = addDays(occurrenceEndDate, 1);
          }
        } else if (frequency === 'DOES_NOT_REPEAT') {
          if (isOccurrenceInRange(occurrenceStartDate, occurrenceEndDate)) {
            return true;
          }
        } else if (frequency === 'CUSTOM' && customRecurrenceRule) {
          const {
            frequency,
            interval,
            startDate: customStart,
            endDate: customEnd,
          } = customRecurrenceRule;
          let customOccurrenceStartDate = new Date(customStart);
          let customOccurrenceEndDate = new Date(customEnd);
          // Custom recurrence logic
          if (frequency === 'DAILY') {
            const nextOccurrence = addDays(customOccurrenceStartDate, interval);

            while (nextOccurrence <= endDate && nextOccurrence >= startDate) {
              if (isOccurrenceInRange(nextOccurrence, endDate)) {
                return true;
              }
              customOccurrenceStartDate = addMonths(
                customOccurrenceStartDate,
                interval,
              );
              customOccurrenceEndDate = addMonths(
                customOccurrenceEndDate,
                interval,
              );
            }
          } else if (frequency === 'WEEKLY') {
            const nextOccurrence = addWeeks(
              customOccurrenceStartDate,
              interval,
            );

            while (nextOccurrence <= endDate && nextOccurrence >= startDate) {
              if (isOccurrenceInRange(nextOccurrence, endDate)) {
                return true;
              }
              customOccurrenceStartDate = addMonths(
                customOccurrenceStartDate,
                interval,
              );
              customOccurrenceEndDate = addMonths(
                customOccurrenceEndDate,
                interval,
              );
            }
          } else if (frequency === 'MONTHLY') {
            const nextOccurrence = addMonths(customOccurrenceStartDate, 1);

            while (nextOccurrence <= endDate && nextOccurrence >= startDate) {
              if (isOccurrenceInRange(nextOccurrence, endDate)) {
                return true;
              }
              customOccurrenceStartDate = addMonths(
                customOccurrenceStartDate,
                interval,
              );
              customOccurrenceEndDate = addMonths(
                customOccurrenceEndDate,
                interval,
              );
            }
          } else if (frequency === 'YEARLY') {
            const nextOccurrence = addYears(customOccurrenceStartDate, 1);

            while (nextOccurrence <= customOccurrenceEndDate) {
              if (isOccurrenceInRange(nextOccurrence, endDate)) {
                return true;
              }
              customOccurrenceStartDate = addMonths(
                customOccurrenceStartDate,
                interval,
              );
              customOccurrenceEndDate = addMonths(
                customOccurrenceEndDate,
                interval,
              );
            }
          }
        }

        // If no recurrence matches, filter out the meeting
        return false;
      });
      return filteredMeetings;
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelMeeting(id: number): Promise<any> {
    const isMeetingIdExist = await this.findOne(id);

    if (!isMeetingIdExist) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_MEETING_ID,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      await this.emailService.processEmail(
        'welcome',
        isMeetingIdExist.requiredCandidates,
        isMeetingIdExist,
        EMAIL_SUBJECTS.CALENDAR_INVITE,
        'cancel',
        String(isMeetingIdExist.id),
      );
      await this.prisma.calendar.delete({
        where: { id },
      });
      return new ResponseSuccess(SUCCESS_MESSAGES.MEETING_CANCELLED);
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMeeting(id: number, data: CreateCalendarInviteDto): Promise<any> {
    const isMeetingIdExist = await this.findOne(id);

    if (!isMeetingIdExist) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_MEETING_ID,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const oldSendList = isMeetingIdExist.requiredCandidates;
      const newSendList = data.requiredCandidates;
      const deleteEmail = oldSendList.filter(
        (o) => newSendList.indexOf(o) === -1,
      );
      const newEmail = newSendList.filter((o) => oldSendList.indexOf(o) === -1);

      const updateMeeting = await this.prisma.calendar.update({
        where: { id },
        data,
      });
      const isStartDateChanged =
        new Date(isMeetingIdExist.startDateTime).getTime() !==
        new Date(data.startDateTime).getTime();
      const isEndDateChanged =
        new Date(isMeetingIdExist.endDateTime).getTime() !==
        new Date(data.endDateTime).getTime();

      if (isStartDateChanged || isEndDateChanged) {
        await this.emailService.processEmail(
          'welcome',
          newSendList,
          updateMeeting,
          EMAIL_SUBJECTS.CALENDAR_INVITE,
          'invite',
          String(isMeetingIdExist.id),
        );
      }
      if (deleteEmail.length > 0) {
        await this.emailService.processEmail(
          'welcome',
          deleteEmail,
          updateMeeting,
          EMAIL_SUBJECTS.CALENDAR_INVITE,
          'cancel',
          String(isMeetingIdExist.id),
        );
      }
      if (newEmail.length > 0) {
        await this.emailService.processEmail(
          'welcome',
          newEmail,
          updateMeeting,
          EMAIL_SUBJECTS.CALENDAR_INVITE,
          'invite',
          String(isMeetingIdExist.id),
        );
      }
      return new ResponseSuccess(SUCCESS_MESSAGES.MEETING_UPDATED);
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number) {
    return await this.prisma.calendar.findFirst({
      where: {
        id: Number(id),
      },
    });
  }

  async getSingleMeeting(id: number) {
    try {
      const response = await this.prisma.calendar.findFirst({
        where: {
          id: id,
        },
      });

      if (!response) {
        throw new HttpException(
          {
            message: ERROR_MESSAGES.INVALID_MEETING_ID,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          {
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
