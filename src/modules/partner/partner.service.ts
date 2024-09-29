import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DisposableEmailDomain } from 'src/shared/helpers/disposableEmailDomain.helper';
import { EMAIL_SUBJECTS, ERROR_MESSAGES } from 'src/shared/constants/strings';
import { generatePassword } from 'src/shared/helpers/passwordGenerator.helpers';
import {
  ModuleType,
  Partner,
  Prisma,
  ProgressStatus,
  StatusType,
  User,
} from '@prisma/client';
import { EmailService } from 'src/shared/services';

import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { PendingApprovalService } from '../pending_approval_actions/pending_approval_actions.service';

import { CreatePartnerDto, UpdatePartnerDto } from './partner.dto';

@Injectable()
export class PartnerService {
  constructor(
    private prisma: PrismaService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private pendingApprovalService: PendingApprovalService,
    private emailService: EmailService,
  ) {}

  async create(data: CreatePartnerDto) {
    const emailDomain = data.customerEmail.split('@')[1];

    //create organization if not exist
    let orgData = await this.organizationService.findOrganization({
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

    return this.prisma.$transaction(async (tx) => {
      if (!orgData) {
        //create organization
        const orgObj = {
          companyName: data.companyName,
          companyWebsite: data.companyWebsite,
          linkedInUrl: data.linkedInUrl,
          socialMediaUrls: data.socialMediaUrls,
          industry: data.industry,
          organizationDomain: emailDomain,
        };

        orgData = await this.organizationService.createOrganization(orgObj, tx);
      }

      //create user
      if (!(await DisposableEmailDomain.isDisposable(data.customerEmail))) {
        throw new HttpException(
          { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
          HttpStatus.BAD_REQUEST,
        );
      }

      const password = await generatePassword();

      const userData = {
        email: data.customerEmail,
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        roleId: data.roleId,
        phoneNo: data.customerPhoneNo,
        organizationId: orgData.id,
        jobTitle: data.jobTitle,
        isInvitedBy: data.isInvitedBy,
        isInvitationPending: true,
        status: StatusType.CHANGE_PASSWORD,
        password,
      };

      //check if user exist or not
      let userInfo: User = await this.userService.findUserDetail({
        where: { email: data.customerEmail },
      });

      if (!userInfo?.id) {
        userInfo = await this.userService.signUpUser(userData, tx);
        this.userService.sentAccountCreationEmail(userData, tx);
      }

      if (userInfo) {
        if (userInfo.organizationId !== orgData.id) {
          throw new HttpException(
            {
              message: `You can only add ${orgData.companyName} organization user, this user already exist in other organization`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        let partnerInfo: any = await this.findOne({
          organizationId: data.organizationId,
          partnerOrganizationId: userInfo.organizationId,
        });

        if (!partnerInfo?.id) {
          const partnerObj = {
            partnerType: data.partnerType,
            isInvitedBy: data.isInvitedBy,
            organizationId: data.organizationId,
            partnerOrganizationId: userInfo.organizationId,
            partnerUserId: userInfo.id,
            status:
              userInfo.status !== StatusType.ACTIVE
                ? StatusType.PENDING
                : StatusType.ACTIVE,
          };

          partnerInfo = await tx.partner.create({
            data: partnerObj,
          });

          const emailData = {
            firstName: userInfo.firstName,
            email: userInfo.email,
            partnerType: partnerInfo.partnerType,
            isInvitedBy: userInfo.isInvitedBy,
          };

          this.sentPartnerCreationEmail(emailData);
        }

        return partnerInfo;
      }
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PartnerWhereUniqueInput;
    where?: Prisma.PartnerWhereInput;
    orderBy?: Prisma.PartnerOrderByWithRelationInput;
  }): Promise<Partner[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.partner.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findMyPartnerList(
    params: { where?: Prisma.PartnerWhereInput },
    organizationId: number,
  ) {
    const { where } = params;
    const partnerList: any = await this.prisma.partner.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
          },
        },
        partnerOrganization: {
          select: {
            id: true,
            companyName: true,
          },
        },
        organization: {
          select: {
            id: true,
            companyName: true,
          },
        },
        partnerInvitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
          },
        },
      },
    });

    const myPartnerList = partnerList.map((partner) => {
      if (partner.partnerOrganizationId === organizationId) {
        return {
          primaryContactFirstName: partner.partnerInvitedBy?.firstName,
          primaryContactLastName: partner.partnerInvitedBy?.lastName,
          primaryContactEmail: partner.partnerInvitedBy?.email,
          primaryContactPhoneNo: partner.partnerInvitedBy?.phoneNo,
          companyName: partner.organization?.companyName,
          organizationId: partner.organizationId,
          id: partner.id,
          isParent: false,
        };
      } else {
        return {
          primaryContactFirstName: partner.user?.firstName,
          primaryContactLastName: partner.user?.lastName,
          primaryContactEmail: partner.user?.email,
          primaryContactPhoneNo: partner.user?.phoneNo,
          companyName: partner.partnerOrganization?.companyName,
          organizationId: partner.partnerOrganization?.id,
          id: partner.id,
          isParent: true,
        };
      }
    });

    return myPartnerList;
  }

  async findPartnerDetail(params: { where?: Prisma.PartnerWhereInput }) {
    const { where } = params;
    const partner: any = await this.prisma.partner.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
            roleId: true,
            jobTitle: true,
          },
        },
        partnerOrganization: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            socialMediaUrls: true,
            linkedInUrl: true,
            companyWebsite: true,
          },
        },
        updatedPartnerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
            roleId: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!partner) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_PARTNER },
        HttpStatus.BAD_REQUEST,
      );
    }

    const partnerDetail = {
      partnerType: partner.partnerType,
      partnerOrganizationId: partner.partnerOrganizationId,
      status: partner.status,
      partnerUserId: partner.partnerUserId,
      customerContactFirstName: partner.user?.firstName,
      customerContactLastName: partner.user?.lastName,
      customerContactEmail: partner.user?.email,
      customerContactPhoneNo: partner.user?.phoneNo,
      jobTitle: partner.user.jobTitle,
      companyName: partner.partnerOrganization?.companyName,
      organizationId: partner.partnerOrganization?.id,
      industry: partner.partnerOrganization?.industry,
      companyWebsite: partner.partnerOrganization?.companyWebsite,
      linkedInUrl: partner.partnerOrganization?.linkedInUrl,
      socialMediaUrls: partner.partnerOrganization?.socialMediaUrls,
      roleId: partner.user?.roleId,
      id: partner.id,
      pendingUpdatePartnerUser: partner.updatedPartnerUser,
    };

    return partnerDetail;
  }

  findOne(where: Prisma.PartnerWhereInput) {
    return this.prisma.partner.findFirst({
      where,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} partner`;
  }

  async update(params: {
    where: Prisma.PartnerWhereInput;
    data: UpdatePartnerDto;
  }): Promise<Partner> {
    const { where, data } = params;

    // First, find the partner
    const partner = await this.prisma.partner.findFirst({
      where,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!partner) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const partnerObj: any = {
        partnerType: data.partnerType,
        isInvitedBy: data.isInvitedBy,
      };

      if (partner.user.email !== data.customerEmail) {
        //create user
        if (!(await DisposableEmailDomain.isDisposable(data.customerEmail))) {
          throw new HttpException(
            { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
            HttpStatus.BAD_REQUEST,
          );
        }

        //check if user exist or not
        let userInfo: User = await this.userService.findUserDetail({
          where: { email: data.customerEmail },
        });

        if (userInfo?.id && userInfo.status === StatusType.ACTIVE) {
          partnerObj.partnerUserId = userInfo.id;

          await this.updateNewPartnerUser(userInfo.id, partner.id, tx);
        } else if (!userInfo?.id) {
          const emailDomain = partner.user.email.split('@')[1];
          const AuthUserEmailDomain = data.customerEmail.split('@')[1];

          if (emailDomain !== AuthUserEmailDomain) {
            throw new HttpException(
              { message: ERROR_MESSAGES.ORGANIZATION_USER_INVITE },
              HttpStatus.BAD_REQUEST,
            );
          }

          const password = await generatePassword();
          const userData = {
            email: data.customerEmail,
            firstName: data.customerFirstName,
            lastName: data.customerLastName,
            roleId: data.roleId,
            phoneNo: data.customerPhoneNo,
            organizationId: partner.partnerOrganizationId,
            jobTitle: data.jobTitle,
            isInvitedBy: data.isInvitedBy,
            isInvitationPending: true,
            status: StatusType.CHANGE_PASSWORD,
            password,
          };

          userInfo = await this.userService.signUpUser(userData, tx);
          this.userService.sentAccountCreationEmail(userData, tx);

          const approvalInfoId = await this.pendingApprovalService.upsert(
            {
              updatedData: {
                partnerUserId: userInfo.id,
              },
              updateId: partner.id,
              updatedByUserId: data.isInvitedBy,
              moduleType: ModuleType.PARTNER,
              requiredApprovalBy: userInfo.id,
              status: StatusType.PENDING,
            },
            userInfo.approvalId,
            tx,
          );

          await this.userService.updateUser(
            {
              where: { id: userInfo.id },
              data: { approvalId: approvalInfoId },
            },
            tx,
          );

          partnerObj.updatedPartnerUserId = userInfo.id;
        }
      } else {
        const updateUserData = {
          firstName: data.customerFirstName,
          lastName: data.customerLastName,
          jobTitle: data.jobTitle,
        };

        await this.userService.updateUser(
          {
            where: { email: data.customerEmail },
            data: updateUserData,
          },
          tx,
        );
      }

      return tx.partner.update({
        where: { id: partner.id },
        data: partnerObj,
      });
    });
  }

  async updateNewPartnerUser(
    partnerUserId: number,
    partnerId?: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    const user = await prisma.user.findFirst({
      where: { id: partnerUserId },
    });

    if (!user) {
      return null;
    }

    if (user.approvalId) {
      const approvalInfo = await this.pendingApprovalService.findOne(
        user.approvalId,
      );

      partnerId = approvalInfo.updateId;
      await this.pendingApprovalService.remove(user.approvalId);

      await this.userService.updateUser({
        where: { id: user.id },
        data: { approvalId: null },
      });

      await this.prisma.partner.update({
        where: { id: partnerId },
        data: { partnerUserId: user.id, updatedPartnerUserId: null },
      });
    }

    const partnerInfo = await this.findOne({
      id: partnerId,
    });

    //update plans
    await prisma.plan.updateMany({
      data: { partnerManagerId: partnerUserId },
      where: {
        partnerId: partnerId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });

    //update creator of initiative
    await prisma.initiative.updateMany({
      data: { createdBy: partnerUserId },
      where: {
        createdBy: partnerInfo.partnerUserId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });

    //update owner of initiative
    await prisma.initiative.updateMany({
      data: { ownerId: partnerUserId },
      where: {
        ownerId: partnerInfo.partnerUserId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });

    //update creator of goal
    await prisma.goal.updateMany({
      data: { createdBy: partnerUserId },
      where: {
        createdBy: partnerInfo.partnerUserId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });

    //update owner of goal
    await prisma.goal.updateMany({
      data: { ownerId: partnerUserId },
      where: {
        ownerId: partnerInfo.partnerUserId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });

    //update owner of project
    await prisma.project.updateMany({
      data: { ownerId: partnerUserId },
      where: {
        ownerId: partnerInfo.partnerUserId,
      },
    });

    //update owner of projectActivity
    await prisma.projectActivity.updateMany({
      data: { ownerId: partnerUserId },
      where: {
        ownerId: partnerInfo.partnerUserId,
        NOT: { status: ProgressStatus.COMPLETED },
      },
    });
  }

  async updatePartner(params: {
    where: Prisma.PartnerWhereInput;
    data: Prisma.PartnerUncheckedUpdateInput;
  }): Promise<Partner> {
    const { where, data } = params;

    // First, find the partner
    const partner = await this.prisma.partner.findFirst({ where });

    if (!partner) {
      return null;
    }

    // Then update using the id
    return this.prisma.partner.update({
      where: { id: partner.id },
      data,
    });
  }

  async sentPartnerCreationEmail(data) {
    const userData = await this.userService.findUserWithDetail({
      id: data.isInvitedBy,
    });

    const emailData = {
      name: data.firstName,
      companyName: userData.organization.companyName,
      invitedBy: userData.firstName,
      partnerType: data.partnerType,
    };

    this.emailService.processEmail(
      'partner-creation',
      [data.email],
      emailData,
      EMAIL_SUBJECTS.INVITE_PARTNER,
    );

    return true;
  }

  async getPartnerTypes() {
    return this.prisma.partnerType.findMany({ orderBy: [{ type: 'asc' }] });
  }

  async listPartnerStackHolders(
    partnerId: number,
    organizationId: number,
    type: string,
  ) {
    const partnerUser: any = await this.prisma.partner.findFirst({
      where: { id: partnerId },
      include: {
        user: {
          select: {
            id: true,
            organizationId: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true,
          },
        },
        partnerInvitedBy: {
          select: {
            id: true,
            organizationId: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true,
          },
        },
      },
    });

    let userList = [];
    if (type === 'OPPORTUNITIES') {
      userList.push(partnerUser.user);
    } else {
      let filterRoleCond: any = {
        id: {
          notIn: [partnerUser.user.id, partnerUser.partnerInvitedBy.id],
        },
      };

      if (type === 'INITIATIVES' || type === 'PLAN') {
        filterRoleCond = {
          ...filterRoleCond,
          roleId: {
            notIn: [1, 2, 3, 5],
          },
        };
      } else {
        filterRoleCond = {
          ...filterRoleCond,
          roleId: {
            notIn: [1],
          },
        };
      }

      const whereCond = {
        organizationId,
        ...filterRoleCond, // spread the filterRoleCond
      };

      const myOrgUsers = await this.userService.users({
        where: whereCond,
      });

      userList = myOrgUsers.map((user) => {
        return {
          id: user.id,
          organizationId: user.organizationId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roleId: user.roleId,
        };
      });

      userList.push(partnerUser.user);
      userList.push(partnerUser.partnerInvitedBy);
    }

    return userList;
  }
}
