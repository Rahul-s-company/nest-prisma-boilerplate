import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  Response,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/core/decorators';
import { ResponseSuccess } from 'src/utils/response/response';
import { VerificationType } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';

import { DisposableEmailDomain } from '../../shared/helpers/disposableEmailDomain.helper';
import {
  JWT_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from '../../shared/constants/global.constants';
import { UserService } from '../user/user.service';
import { SalesForceService } from '../sales-force/sales-force.service';
import { SalesforceAuthResponseDTO } from '../sales-force/sales-force.dto';

import { AuthService } from './auth.service';
import {
  AuthResponseDTO,
  LoginUserDTO,
  RegisterUserDTO,
  RefreshTokenDTO,
  ChangePasswordDTO,
  VerifyAccountDTO,
  ResetPasswordDTO,
  ResponseDTO,
  ProfileDTO,
  VerifyTokenDTO,
} from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private userService: UserService,
    private salesForceService: SalesForceService,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ description: 'Login user' })
  @ApiBody({ type: LoginUserDTO })
  @ApiResponse({ type: AuthResponseDTO })
  async login(
    @Body() user: LoginUserDTO,
    @Response() res,
  ): Promise<AuthResponseDTO> {
    const loginData = await this.authService.login(user);

    res.cookie('accessToken', loginData.accessToken, {
      expires: new Date(new Date().getTime() + JWT_EXPIRY_SECONDS * 1000),
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
    });

    // Set refresh token in cookie
    res.cookie('refreshToken', loginData.refreshToken, {
      expires: new Date(
        new Date().getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
      ),
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
    });

    return res.status(200).send(loginData);
  }

  @Post('register')
  @Public()
  @ApiOperation({ description: 'Register user' })
  @ApiBody({ type: RegisterUserDTO })
  async register(
    @Body() user: RegisterUserDTO,
  ): Promise<ResponseDTO | HttpException> {
    if (!(await DisposableEmailDomain.isDisposable(user.email))) {
      throw new HttpException(
        { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userData = await this.authService.register(user);

    if (userData) {
      const emailOtp = await this.authService.sendEmailOtp(
        userData.email,
        'ACCOUNT_VERIFICATION',
      );

      if (userData.roleId === 1) {
        this.authService.sendWelcomeEmail(userData.email);
      }

      if (emailOtp) {
        return new ResponseSuccess(ERROR_MESSAGES.ACCOUNT_VERIFICATION);
      }
    }
  }

  @Post('refresh-token')
  @ApiOperation({ description: 'Refresh Token' })
  @ApiBody({ type: RefreshTokenDTO })
  @ApiResponse({ type: AuthResponseDTO })
  @Public()
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDTO,
    @Response() res,
  ): Promise<AuthResponseDTO> {
    const refreshedTokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );

    // Set the new access token in the cookie
    res.cookie('accessToken', refreshedTokens.accessToken, {
      expires: new Date(new Date().getTime() + JWT_EXPIRY_SECONDS * 1000),
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
    });

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshedTokens.refreshToken, {
      expires: new Date(
        new Date().getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
      ),
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
    });

    return res.status(200).send(refreshedTokens);
  }

  @Put('change-password')
  @ApiOperation({ description: 'Change Password' })
  @ApiBody({ type: ChangePasswordDTO })
  async changePassword(
    @Body() data: ChangePasswordDTO,
    @Req() req,
  ): Promise<ResponseDTO | HttpException> {
    const changePasswordRes = await this.authService.changePassword(
      data,
      req.user.email,
    );

    if (!changePasswordRes.id) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess('Password Change Successfully');
  }

  @Post('verify-account')
  @Public()
  @ApiOperation({ description: 'verify email through otp' })
  @ApiBody({ type: VerifyAccountDTO })
  async verifyAccount(
    @Body() data: VerifyAccountDTO,
  ): Promise<ResponseDTO | HttpException> {
    data.type = 'ACCOUNT_VERIFICATION';
    const verifyOtp = await this.authService.verifyOtp(data);

    if (verifyOtp) {
      await this.userService.updateUser({
        where: { id: verifyOtp.userId },
        data: { status: 'ACTIVE' },
      });

      return new ResponseSuccess(
        SUCCESS_MESSAGES.ACCOUNT_VERIFICATION_COMPLETE,
      );
    }
  }

  @Get('resend-otp/:email/:type')
  @Public()
  @ApiOperation({ description: 'verify email through otp' })
  @ApiParam({ name: 'email', required: true })
  @ApiParam({ name: 'type', required: true, enum: VerificationType })
  async resentOtp(
    @Param() params: { email: string; type: VerificationType },
  ): Promise<ResponseDTO | HttpException> {
    const emailOtp = await this.authService.sendEmailOtp(
      params.email,
      params.type,
    );

    if (emailOtp) {
      return new ResponseSuccess(SUCCESS_MESSAGES.RESET_PASSWORD_EMAIL_SENT);
    }
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ description: 'reset user password' })
  @ApiBody({ type: ResetPasswordDTO })
  async resetPassword(
    @Body() data: ResetPasswordDTO,
  ): Promise<ResponseDTO | HttpException> {
    data.type = 'FORGOT_PASSWORD';
    const verifyToken = await this.authService.verifyToken(data);

    if (verifyToken) {
      const updatePassword = await this.userService.updateUser({
        where: { email: data.email },
        data: { password: data.password },
      });

      if (!updatePassword.id) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, status: false },
          HttpStatus.BAD_REQUEST,
        );
      }

      return new ResponseSuccess(SUCCESS_MESSAGES.CHANGE_PASSWORD_MSG);
    }
  }

  @Post('verify-otp')
  @Public()
  @ApiOperation({ description: 'verify otp' })
  @ApiBody({ type: VerifyAccountDTO })
  async verifyOtp(
    @Body() data: VerifyAccountDTO,
  ): Promise<ResponseDTO | HttpException> {
    const verifyOtp = await this.authService.verifyOtp(data, true);

    if (verifyOtp) {
      return new ResponseSuccess(SUCCESS_MESSAGES.OTP_VERIFIED);
    }
  }

  @Post('verify-token')
  @Public()
  @ApiOperation({ description: 'verify token' })
  @ApiBody({ type: VerifyTokenDTO })
  async verifyToken(
    @Body() data: VerifyTokenDTO,
  ): Promise<ResponseDTO | HttpException> {
    const userData = await this.authService.verifyToken(data, true);

    if (userData) {
      return new ResponseSuccess(SUCCESS_MESSAGES.LINK_VERIFIED, userData);
    }
  }

  @Get('forgot-password/:email')
  @Public()
  @ApiParam({ name: 'email', required: true })
  @ApiOperation({ description: 'sent forgot password email link' })
  async forgotPassword(
    @Param() params: { email: string },
  ): Promise<ResponseDTO | HttpException> {
    const sentEmail = await this.authService.sendResetPassEmail(params.email);

    if (sentEmail) {
      return new ResponseSuccess('RESET PASSWORD EMAIL SENT');
    }
  }

  @Post('logout')
  logout(@Response() res): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).send({ success: true });
  }

  @Get('get-profile')
  @ApiOperation({ description: 'Get logged in user profile' })
  async getProfile(@Req() req): Promise<ResponseDTO> {
    const getProfile = await this.authService.getProfile(req.user.id);

    if (!getProfile) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess('User Profile', getProfile);
  }

  @Put('update-profile')
  @ApiOperation({ description: 'Update user profile' })
  async updateProfile(
    @Body() data: ProfileDTO,
    @Req() req,
  ): Promise<ResponseDTO> {
    const updateProfile = await this.authService.updateProfile(
      data,
      req.user.id,
    );

    if (!updateProfile) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess('Update Profile Successfully', updateProfile);
  }

  @Get('salesforce-login')
  @Public()
  async authenticate(@Res() res) {
    const authorizationUrl = await this.salesForceService.getAuthorizationUrl();
    res.redirect(authorizationUrl);
  }

  @Get('salesforce-callback')
  @Public()
  async getAccessToken(@Query('code') code, @Res() res) {
    try {
      const tokenInfo: SalesforceAuthResponseDTO =
        await this.salesForceService.getAccessToken(code);

      const getUserAndOrganizationDetails =
        await this.salesForceService.getUserAndOrganizationDetails(
          tokenInfo.accessToken,
          tokenInfo.instanceUrl,
        );

      const loginData = await this.authService.ssoLoginOrSignup(
        tokenInfo,
        getUserAndOrganizationDetails,
      );

      res.cookie('accessToken', loginData.accessToken, {
        expires: new Date(new Date().getTime() + JWT_EXPIRY_SECONDS * 1000),
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
      });

      // Set refresh token in cookie
      res.cookie('refreshToken', loginData.refreshToken, {
        expires: new Date(
          new Date().getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        ),
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
      });

      // Handle the access token as needed
      const string = encodeURIComponent(loginData.accessToken);
      res.redirect(
        `${process.env.FRONTEND_URL}/${process.env.FRONTEND_SSO_REDIRECT_PATH}?token=${string}`,
      );
    } catch (err) {
      console.error(err);
      res.redirect(
        `${process.env.FRONTEND_URL}/${process.env.FRONTEND_SSO_REDIRECT_PATH}?error= Failed to get access token`,
      );
    }
  }

  @Get('verify-jwt-token')
  @ApiOperation({ description: 'Get logged in user profile' })
  async verifyJwtToken(@Req() req): Promise<ResponseDTO> {
    const userData = await this.userService.findUser({
      email: req.user.email,
    });

    if (!userData) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess('Valid token', true);
  }
}
