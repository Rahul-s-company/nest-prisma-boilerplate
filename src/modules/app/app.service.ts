import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EmailService } from 'src/shared/services';
import { ContactUs, Prisma } from '@prisma/client';
import { EMAIL_SUBJECTS, ERROR_MESSAGES } from 'src/shared/constants/strings';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async saveContactForm(data: Prisma.ContactUsCreateInput): Promise<ContactUs> {
    const userInfo = await this.prisma.contactUs.create({ data });
    const emails = process.env.INFO_EMAIL.split(',');

    if (userInfo) {
      const emailData = {
        email: data.email,
        name: data.name,
        message: data.message,
        subject: data.subject,
      };

      this.emailService.processEmail(
        'contact-us',
        emails,
        emailData,
        EMAIL_SUBJECTS.INQUIRY,
      );

      return userInfo;
    }

    throw new HttpException(
      { meassage: ERROR_MESSAGES.INTERNAL_ERR_MSG },
      HttpStatus.BAD_REQUEST,
    );
  }
}
