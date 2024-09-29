import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OTP, StatusType, User, VerificationType } from '@prisma/client';
import { EmailService } from 'src/shared/services/email.service';
import { EMAIL_SUBJECTS, ERROR_MESSAGES } from 'src/shared/constants/strings';
import { generateToken } from 'src/shared/helpers/passwordGenerator.helpers';
import { ChimeService } from 'src/shared/services';

import { UserService } from '../user/user.service';
import { OrganizationService } from '../organization/organization.service';
import { AuthHelpers } from '../../shared/helpers/auth.helpers';
import { GLOBAL_CONFIG } from '../../configs/global.config';
import { PrismaService } from '../prisma/prisma.service';
import { SalesforceAuthResponseDTO } from '../sales-force/sales-force.dto';
import { SalesForceService } from '../sales-force/sales-force.service';
import { PartnerService } from '../partner/partner.service';
import { UserRoleService } from '../user-role/user-role.service';

import {
  AuthResponseDTO,
  LoginUserDTO,
  RegisterUserDTO,
  RefreshResponseDTO,
  ChangePasswordDTO,
  VerifyAccountDTO,
  ProfileDTO,
  GetProfileResponseDto,
  VerifyTokenDTO,
  authPayload,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private userRoleService: UserRoleService,
    private organizationService: OrganizationService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private salesForceService: SalesForceService,
    private partnerService: PartnerService,
    private chimeService: ChimeService,
  ) {}

  public async login(
    loginUserDTO: LoginUserDTO,
    ssoLogin = false,
  ): Promise<AuthResponseDTO> {
    const userData = await this.userService.findUser({
      email: loginUserDTO.email,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.NO_USER_FOUND);
    }

    if (userData.status === 'PENDING') {
      throw new HttpException(
        { message: ERROR_MESSAGES.PENDING_ACCOUNT_VERIFICATION },
        HttpStatus.NON_AUTHORITATIVE_INFORMATION,
      );
    }

    //bypass password verification for sso login
    if (!ssoLogin) {
      const isMatch = await AuthHelpers.verify(
        loginUserDTO.password,
        userData.password,
      );

      if (!isMatch) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CRED);
      }
    }

    const payload: authPayload = {
      id: userData.id,
      roleId: userData.roleId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: null,
      jobTitle: userData.jobTitle,
      organizationId: userData.organizationId,
      isVerified: userData.isVerified,
      status: userData.status,
    };

    const organizationInfo: { companyName?: string } = {};

    if (userData.organizationId) {
      const orgData = await this.organizationService.findOrganization({
        id: userData.organizationId,
      });

      organizationInfo.companyName = orgData.companyName;
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: GLOBAL_CONFIG.security.expiresIn,
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      expiresIn: GLOBAL_CONFIG.security.refreshExpiresIn,
    });

    userData.password = null;

    if (userData.isInvitedBy && userData.isInvitationPending === true) {
      await this.userService.updateUser({
        where: { id: userData.id },
        data: { isInvitationPending: false, status: 'ACTIVE' },
      });

      await this.partnerService.updatePartner({
        where: {
          partnerUserId: userData.id,
          partnerOrganizationId: userData.organizationId,
        },
        data: { status: 'ACTIVE' },
      });
    }

    if (userData.approvalId) {
      await this.partnerService.updateNewPartnerUser(userData.id);
    }

    let isProfileDone = true;

    if (
      !userData.firstName ||
      !userData.lastName ||
      !userData.jobTitle ||
      !userData.organizationId
    ) {
      isProfileDone = false;
    }

    const permissions = await this.userRoleService.getPermissionsForRole(
      userData.roleId,
      userData.organizationId,
    );

    return {
      user: userData,
      organization: organizationInfo,
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      isProfileDone,
      permissions,
    };
  }

  public async register(user: RegisterUserDTO): Promise<any> {
    const emailDomain = user.email.split('@')[1];

    const orgData = await this.organizationService.findOrganization({
      organizationDomain: {
        equals: `${emailDomain}`,
        mode: 'insensitive',
      },
    });

    if (orgData?.id) {
      user.organizationId = orgData.id;
    }
    return this.userService.signUpUser(user);
  }

  public async refreshTokens(
    refreshToken: string,
  ): Promise<RefreshResponseDTO> {
    // Verify the refresh token and extract the payload
    const tokenPayload = this.jwtService.verify(refreshToken, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    });

    // Check if the user associated with the token exists
    const user = await this.userService.findUser({
      id: tokenPayload.id,
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    // Generate a new payload for the tokens
    const payload: authPayload = {
      id: user.id,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: null,
      jobTitle: user.jobTitle,
      organizationId: user.organizationId,
      isVerified: user.isVerified,
      status: user.status,
    };

    // Generate a new access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: GLOBAL_CONFIG.security.expiresIn,
    });

    // Optionally, generate a new refresh token
    const newRefreshToken = this.jwtService.sign(payload, {
      expiresIn: GLOBAL_CONFIG.security.refreshExpiresIn,
    });

    // Return the new tokens
    return {
      accessToken,
      refreshToken: newRefreshToken, // Optionally return a new refresh token
    };
  }

  public async changePassword(
    data: ChangePasswordDTO,
    email: string,
  ): Promise<User> {
    const userData = await this.userService.findUser({
      email: email,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    const isMatch = await AuthHelpers.verify(
      data.oldPassword,
      userData.password,
    );

    if (!isMatch) {
      throw new HttpException(
        { message: ERROR_MESSAGES.OLD_PASSWORD_INCORRECT },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updateData = { password: data.newPassword };

    if (userData.status === 'CHANGE_PASSWORD') {
      userData.status = 'ACTIVE';
    }

    return this.userService.updateUser({
      where: { email: userData.email },
      data: updateData,
    });
  }

  public async sendEmailOtp(
    email: string,
    type: VerificationType,
  ): Promise<OTP> {
    const userData = await this.userService.findUser({
      email: email,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    const newOtp = await this.generateOtp(userData.id, type);

    if (newOtp) {
      const htmlData: any = {
        otp: newOtp.otp,
        name: userData.firstName,
      };

      if (type === 'ACCOUNT_VERIFICATION') {
        this.emailService.processEmail(
          'verify-account',
          [email],
          htmlData,
          EMAIL_SUBJECTS.OTP_VERIFICATION,
        );
      } else {
        htmlData.link = `${process.env.FRONTEND_URL}/reset-password/?token=${newOtp.otp}`;

        this.emailService.processEmail(
          'forgot-password',
          [email],
          htmlData,
          EMAIL_SUBJECTS.OTP_VERIFICATION,
        );
      }

      return newOtp;
    }

    throw new Error(ERROR_MESSAGES.INVALID_USER);
  }

  public async generateOtp(userId: number, type: VerificationType) {
    let newOtp = (Math.floor(Math.random() * 900000) + 100000).toString();

    //temporary overwrite otp
    newOtp = '123456';

    if (type === 'FORGOT_PASSWORD') {
      newOtp = generateToken();
    }

    const updateOtp = await this.prisma.oTP.upsert({
      where: {
        userId_type: {
          userId: userId,
          type: type,
        },
      },
      update: {
        otp: newOtp,
        expirationAt: new Date(Date.now() + 60 * 60 * 1000), // Add one hour to the current time
      },
      create: {
        userId: userId,
        otp: newOtp,
        expirationAt: new Date(Date.now() + 60 * 60 * 1000), // Add one hour to the current time
        type,
      },
    });

    if (updateOtp) {
      return updateOtp;
    }

    throw new Error('LOGIN.ERROR.GENERIC_ERROR');
  }

  public async verifyOtp(
    data: VerifyAccountDTO,
    readonly = false,
  ): Promise<OTP> {
    const userData = await this.userService.findUser({
      email: data.email,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    const getOtp = await this.prisma.oTP.findFirst({
      where: {
        userId: userData.id,
        otp: data.otp,
        type: data.type,
      },
    });

    if (!getOtp) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OTP);
    }

    if (new Date().getTime() > getOtp.expirationAt.getTime()) {
      throw new HttpException('OTP has been expired !', HttpStatus.BAD_REQUEST);
    }

    if (!readonly) {
      await this.prisma.oTP.update({
        data: { expirationAt: new Date(Date.now()) },
        where: { id: getOtp.id },
      });
    }

    return getOtp;
  }

  public async verifyToken(
    data: VerifyTokenDTO,
    readonly = false,
  ): Promise<{ email: string }> {
    const getData = await this.prisma.oTP.findFirst({
      where: {
        otp: data.token,
        type: 'FORGOT_PASSWORD',
      },
    });
    const userData = await this.userService.findUser({
      id: getData.userId,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    if (!getData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_EMAIL_LINK);
    }

    if (new Date().getTime() > getData.expirationAt.getTime()) {
      throw new HttpException(
        { message: ERROR_MESSAGES.EMAIL_LINK_EXPIRE },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!readonly) {
      await this.prisma.oTP.update({
        data: { expirationAt: new Date(Date.now()) },
        where: { id: getData.id },
      });
    }

    return { email: userData.email };
  }

  public async sendResetPassEmail(email: string): Promise<OTP> {
    const userData = await this.userService.findUser({
      email: email,
    });

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    const newOtp = await this.generateOtp(userData.id, 'FORGOT_PASSWORD');

    if (newOtp) {
      const htmlData = {
        link: `${process.env.FRONTEND_URL}/reset-password/?token=${newOtp.otp}`,
        name: userData.firstName,
      };
      await this.emailService.processEmail(
        'forgot-password',
        [email],
        htmlData,
        EMAIL_SUBJECTS.RESET_PASSWORD,
      );

      return newOtp;
    }

    throw new Error(ERROR_MESSAGES.INVALID_USER);
  }

  public async getProfile(userId: number): Promise<GetProfileResponseDto> {
    let profileResponse: any = {};

    profileResponse = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profileResponse) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    if (profileResponse.organizationId) {
      const orgData = await this.organizationService.findOrganization({
        id: profileResponse.organizationId,
      });

      if (orgData) {
        profileResponse = { ...profileResponse, ...{ organization: orgData } };
      }
    }
    profileResponse.password = null;

    const permissions = await this.userRoleService.getPermissionsForRole(
      profileResponse.roleId,
      profileResponse.organizationId,
    );

    profileResponse.permissions = permissions;
    return profileResponse;
  }

  public async updateProfile(data: ProfileDTO, userId: number): Promise<User> {
    const userData = await this.userService.findUser({
      id: userId,
    });

    let orgDetail;
    const emailDomain = userData.email.split('@')[1];

    const orgObj = {
      companyName: data.companyName,
      companyWebsite: data.companyWebsite,
      linkedInUrl: data.linkedInUrl,
      industry: data.industry,
      address: data.address,
      country: data.country,
      region: data.region,
      geo: data.geo,
      organizationDomain: emailDomain,
    };

    if (!userData) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_USER);
    }

    const orgData = await this.organizationService.findOrganization({
      OR: [
        {
          companyName: {
            equals: `${data.companyName}`,
            mode: 'insensitive',
          },
        },
        {
          organizationDomain: {
            equals: `${emailDomain}`,
            mode: 'insensitive',
          },
        },
      ],
    });

    if (orgData) {
      if (userData.organizationId && userData.organizationId != orgData.id) {
        throw new HttpException(
          { message: ERROR_MESSAGES.COMPANY_EXIST },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        orgData.organizationDomain !== '' ||
        orgData.organizationDomain !== null
      ) {
        delete orgData.organizationDomain;
      }

      //update organization
      orgDetail = await this.organizationService.updateOrganization({
        where: {
          id: orgData.id,
        },
        data: orgObj,
      });
    } else {
      //create organization
      orgDetail = await this.organizationService.createOrganization(orgObj);
    }

    //remove from obj for user update
    delete data.companyName;
    delete data.companyWebsite;
    delete data.linkedInUrl;

    data.organizationId = orgDetail.id;
    let profileResponse: any = await this.userService.updateUser({
      where: { id: userId },
      data: data,
    });

    if (profileResponse.organizationId) {
      const orgData = await this.organizationService.findOrganization({
        id: profileResponse.organizationId,
      });

      if (orgData) {
        profileResponse = { ...profileResponse, ...{ organization: orgData } };
      }
    }
    profileResponse.password = null;
    await this.chimeService.updateAppInstanceUser(userData, profileResponse);

    const permissions = await this.userRoleService.getPermissionsForRole(
      profileResponse.roleId,
      profileResponse.organizationId,
    );

    profileResponse.permissions = permissions;
    return profileResponse;
  }

  async ssoLoginOrSignup(tokenInfo: SalesforceAuthResponseDTO, userAndOrgInfo) {
    const { userInfo, organizationDetails } = userAndOrgInfo;

    let userData = await this.userService.findUser({
      email: userInfo.email,
    });

    if (!userData) {
      const userObj = {
        salesforceUserId: userInfo.user_id,
        email: userInfo.email,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
        password: '',
        roleId: 1,
        status: StatusType.ACTIVE,
      };

      userData = await this.userService.signUpUser(userObj);
    }
    //upsert token data
    this.salesForceService.upsertSalesforceToken(tokenInfo, userData.id);

    if (!userData.organizationId) {
      const updateData = {
        companyName: organizationDetails.Name,
        salesforceOrgId: organizationDetails.Id,
        country: organizationDetails.Country,
        companyWebsite: '',
      };

      const orgData = await this.organizationService.upsertOrg(updateData);

      await this.userService.updateUser({
        where: { id: userData.id },
        data: { organizationId: orgData.id },
      });
    }

    return this.login({ email: userInfo.email, password: '' }, true);
  }

  async sendWelcomeEmail(email: string) {
    const link = process.env.FRONTEND_URL;
    const name = email.split('@')[0];

    const htmlData = {
      name: name,
      link: link,
    };

    this.emailService.processEmail(
      'welcome',
      [email],
      htmlData,
      EMAIL_SUBJECTS.WELCOME,
    );
  }
}
