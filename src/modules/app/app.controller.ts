import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Public } from 'src/core/decorators';
import { Response } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { DisposableEmailDomain } from 'src/shared/helpers/disposableEmailDomain.helper';

import { ResponseDTO } from '../auth/auth.dto';

import { ContactUsDTO } from './app.dto';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Public()
  @ApiOperation({ description: 'Health check for App server' })
  @Get('/health-check')
  healthCheck(@Response() res): void {
    res.status(200).send({ success: true });
  }

  @Public()
  @ApiOperation({ description: 'contact us form submission' })
  @ApiBody({ type: ContactUsDTO })
  @Post('/contact-us')
  async contactUs(@Body() data): Promise<ResponseDTO> {
    if (!(await DisposableEmailDomain.isDisposable(data.email, true))) {
      throw new HttpException(
        { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
        HttpStatus.BAD_REQUEST,
      );
    }

    const contactInfo = await this.appService.saveContactForm(data);

    if (contactInfo) {
      return new ResponseSuccess('Thank you for reaching out!');
    }

    throw new HttpException(
      { meassage: ERROR_MESSAGES.INTERNAL_ERR_MSG },
      HttpStatus.BAD_REQUEST,
    );
  }
}
