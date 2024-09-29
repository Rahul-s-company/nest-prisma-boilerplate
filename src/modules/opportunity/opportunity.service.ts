import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  NotificationType,
  Opportunity,
  OpportunityInvite,
  OpportunityStatus,
  OpportunityAlertStatus,
  Prisma,
  StatusType,
  User,
} from '@prisma/client';
import { EMAIL_SUBJECTS, ERROR_MESSAGES } from 'src/shared/constants/strings';
import { EmailService } from 'src/shared/services';
import { OpportunityDraftStages } from 'src/types';
import { plainToClass } from 'class-transformer';
import * as csv from 'csv';
import { generatePassword } from 'src/shared/helpers/passwordGenerator.helpers';
import {
  calculateNotificationDate,
  convertToDateTime,
} from 'src/shared/helpers/date.helper';
import { generateUniqueId } from 'src/shared/helpers/utill.helpers';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CreateNotificationDto } from '../notification/notification.dto';
import { NotificationService } from '../notification/notification.service';
import { SalesForceService } from '../sales-force/sales-force.service';

import {
  BulkOpportunityDto,
  OpportunityDTO,
  OpportunityInviteDTO,
} from './opportunity.dto';

@Injectable()
export class OpportunityService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private userService: UserService,
    private notificationService: NotificationService,
    private salesForceService: SalesForceService,
  ) {}
  logger = new Logger(OpportunityService.name);

  async findOne(
    opportunityWhereUniqueInput: Prisma.OpportunityWhereUniqueInput,
  ): Promise<Opportunity | null> {
    return this.prisma.opportunity.findUnique({
      where: opportunityWhereUniqueInput,
    });
  }

  async findMany(
    opportunityWhereInput: Prisma.OpportunityWhereInput,
  ): Promise<Opportunity[] | null> {
    return this.prisma.opportunity.findMany({
      where: opportunityWhereInput,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.OpportunityWhereUniqueInput;
    where?: Prisma.OpportunityWhereInput;
    orderBy?: Prisma.OpportunityOrderByWithRelationInput;
  }): Promise<Opportunity[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.opportunity.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include: {
        opportunityCustomerUser: {
          select: {
            id: true,
            companyName: true,
          },
        },
        opportunityOriginOrganization: {
          select: {
            id: true,
            companyName: true,
          },
        },
        opportunityOwnerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        opportunityOwnerAccountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        opportunityReceiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        opportunityAccountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        opportunityReceiverOrganization: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async create(
    data: Prisma.OpportunityUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Opportunity> {
    const prisma = tx || this.prisma;

    return await prisma.opportunity.create({
      data,
    });
  }

  async update(params: {
    where: Prisma.OpportunityWhereUniqueInput;
    data: Prisma.OpportunityUncheckedUpdateInput;
    tx?: Prisma.TransactionClient;
  }): Promise<Opportunity> {
    const { data, where, tx } = params;
    const prisma = tx ?? this.prisma;

    return await prisma.opportunity.update({
      data,
      where,
    });
  }

  async updateBulkOpportunity(params: {
    where: Prisma.OpportunityWhereInput;
    data: Prisma.OpportunityUncheckedUpdateInput;
  }): Promise<Prisma.BatchPayload> {
    const { data, where } = params;
    return await this.prisma.opportunity.updateMany({
      data,
      where,
    });
  }

  async updateOpportunityInvite(params: {
    where: any;
    data: any;
    tx: Prisma.TransactionClient;
  }): Promise<OpportunityInvite> {
    const { data, where, tx } = params;
    return await tx.opportunityInvite.update({
      data,
      where,
    });
  }

  async delete(
    where: Prisma.OpportunityWhereUniqueInput,
  ): Promise<Opportunity> {
    return this.prisma.opportunity.delete({
      where,
    });
  }

  async createOpportunity(opportunityData: OpportunityDTO, req: any) {
    try {
      const {
        customerDetails,
        projectDetails,
        additionDetails,
        partnerDetails,
        configureAlert,
      } = opportunityData;

      if (projectDetails?.salesforceOpportunityId) {
        const salesforceOpportunity = await this.findMany({
          salesforceOpportunityId: projectDetails.salesforceOpportunityId,
        });

        if (salesforceOpportunity.length > 0) {
          throw new HttpException(
            {
              message: ERROR_MESSAGES.SALESFORCE_OPPORTUNITY_EXIST,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return await this.prisma.$transaction(async (tx) => {
        customerDetails.customerEmail = customerDetails.customerEmail
          ? customerDetails.customerEmail.toLowerCase()
          : customerDetails.customerEmail;

        const addOpportunityCustomer = await tx.opportunityCustomer.create({
          data: customerDetails,
        });

        let opportunityObj: any = {
          opportunityCustomerId: addOpportunityCustomer.id,
          draftStage: OpportunityDraftStages.CUSTOMER,
          originOrganizationId: req.user.organizationId,
          opportunityOwnerUserId: req.user.id,
          createdBy: req.user.id,
        };

        if (projectDetails) {
          opportunityObj = {
            ...opportunityObj,
            ...projectDetails,
          };

          opportunityObj.draftStage = OpportunityDraftStages.PROJECT;
        }

        if (additionDetails) {
          opportunityObj = {
            ...opportunityObj,
            ...additionDetails,
          };

          opportunityObj.draftStage = OpportunityDraftStages.ADDITIONAL;
        }

        let findPartnerUser: User;
        if (partnerDetails) {
          const emailDomain = partnerDetails.primaryContactEmail.split('@')[1];
          const AuthUserEmailDomain = req.user.email.split('@')[1];

          if (emailDomain !== AuthUserEmailDomain) {
            throw new HttpException(
              { message: ERROR_MESSAGES.ORGANIZATION_USER_INVITE },
              HttpStatus.BAD_REQUEST,
            );
          }

          //check if user exist or not
          findPartnerUser = await this.userService.findUserDetail({
            where: {
              email: partnerDetails.primaryContactEmail,
              organizationId: req.user.organizationId,
            },
          });

          if (findPartnerUser) {
            if (findPartnerUser.roleId !== 3) {
              throw new HttpException(
                { message: ERROR_MESSAGES.ACCOUNT_MANAGER_EMAIL_ALLOWED },
                HttpStatus.BAD_REQUEST,
              );
            }
          } else {
            const password = await generatePassword();

            const userData = {
              email: partnerDetails.primaryContactEmail
                ? partnerDetails.primaryContactEmail.toLowerCase()
                : partnerDetails.primaryContactEmail,
              firstName: partnerDetails.primaryContactFirstName,
              lastName: partnerDetails.primaryContactLastName,
              roleId: 3,
              phoneNo: partnerDetails.primaryContactPhoneNo,
              organizationId: req.user.organizationId,
              isInvitedBy: req.user.id,
              isInvitationPending: true,
              status: StatusType.CHANGE_PASSWORD,
              password,
            };

            findPartnerUser = await this.userService.signUpUser(userData, tx);
            findPartnerUser.password = password;
          }
          opportunityObj.opportunityOwnerAccountManagerId = findPartnerUser.id;

          opportunityObj.draftStage = OpportunityDraftStages.PARTNER;
        }

        if (opportunityData.opportunityReceiverId) {
          opportunityObj = {
            ...opportunityObj,
            opportunityReceiverId: opportunityData.opportunityReceiverId,
            opportunityReceivingOrganizationId:
              opportunityData.opportunityReceiverOrganizationId,
          };
        }

        opportunityObj.status = opportunityData.status
          ? opportunityData.status
          : StatusType.PENDING;

        if (configureAlert && opportunityObj.status === StatusType.DRAFT) {
          opportunityObj.draftStage = OpportunityDraftStages.CONFIGURE;
        }

        if (opportunityObj.status !== StatusType.DRAFT) {
          if (!opportunityData.opportunityReceiverId) {
            throw new HttpException(
              { message: ERROR_MESSAGES.PUBLISH_OPPORTUNITY_ERROR },
              HttpStatus.BAD_REQUEST,
            );
          }

          delete opportunityObj.draftStage;
        }

        opportunityObj.uniqueOpportunityId = generateUniqueId(
          opportunityObj.opportunityCustomerId,
        );

        const createOpportunity = await this.create(opportunityObj, tx);

        if (configureAlert) {
          configureAlert.opportunityId = createOpportunity.id;
          await tx.opportunityAlert.create({ data: configureAlert });

          opportunityObj.draftStage = OpportunityDraftStages.CONFIGURE;
        }

        if (opportunityData.opportunityReceiverId) {
          //sent invite to receiver partner manager
          await this.sentOpportunityInvite(
            {
              opportunityId: createOpportunity.id,
              opportunityReceiverId: opportunityData.opportunityReceiverId,
              status: OpportunityStatus.PENDING,
            },
            tx,
          );

          if (findPartnerUser) {
            //sent alert to owner accountant
            await this.sentOpportunityAlertToOwnerAccountant(
              {
                opportunityId: createOpportunity.id,
                opportunityOwnerAccountManagerId:
                  opportunityObj.opportunityOwnerAccountManagerId,
              },
              findPartnerUser,
              tx,
            );
          }
        }

        return createOpportunity;
      });
    } catch (error) {
      this.logger.error('create opportunities Error:', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG, error: error },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async updateOpportunity(
    opportunityId: number,
    opportunityData: OpportunityDTO,
    req: any,
  ): Promise<Opportunity> {
    try {
      const {
        customerDetails,
        projectDetails,
        additionDetails,
        partnerDetails,
        configureAlert,
      } = opportunityData;

      const opportunityInfo = await this.findOne({ id: opportunityId });

      return await this.prisma.$transaction(async (tx) => {
        let opportunityObj: any = {};

        if (opportunityData.status) {
          opportunityObj = {
            status: opportunityData.status,
          };
        }

        if (customerDetails) {
          customerDetails.customerEmail = customerDetails.customerEmail
            ? customerDetails.customerEmail.toLowerCase()
            : customerDetails.customerEmail;

          const updateOpportunityCustomer = await tx.opportunityCustomer.update(
            {
              data: customerDetails,
              where: { id: opportunityInfo.opportunityCustomerId },
            },
          );

          opportunityObj = {
            ...opportunityObj,
            opportunityCustomerId: updateOpportunityCustomer.id,
          };
        }

        if (projectDetails) {
          opportunityObj = {
            ...opportunityObj,
            ...projectDetails,
          };

          opportunityObj.draftStage = OpportunityDraftStages.PROJECT;
        }

        if (additionDetails) {
          opportunityObj = {
            ...opportunityObj,
            ...additionDetails,
          };

          opportunityObj.draftStage = OpportunityDraftStages.ADDITIONAL;
        }

        let findPartnerUser;

        if (partnerDetails) {
          let accountMangerInfo;

          if (opportunityInfo.opportunityOwnerAccountManagerId) {
            accountMangerInfo = await this.userService.findUser({
              id: opportunityInfo.opportunityOwnerAccountManagerId,
            });
          }

          if (
            !opportunityInfo.opportunityOwnerAccountManagerId ||
            (opportunityInfo.opportunityOwnerAccountManagerId &&
              accountMangerInfo.email !== partnerDetails.primaryContactEmail)
          ) {
            const emailDomain =
              partnerDetails.primaryContactEmail.split('@')[1];
            const AuthUserEmailDomain = req.user.email.split('@')[1];

            if (emailDomain !== AuthUserEmailDomain) {
              throw new HttpException(
                { message: ERROR_MESSAGES.ORGANIZATION_USER_INVITE },
                HttpStatus.BAD_REQUEST,
              );
            }

            //check if user exist or not
            findPartnerUser = await this.userService.findUserDetail({
              where: {
                email: partnerDetails.primaryContactEmail,
                organizationId: req.user.organizationId,
              },
            });

            if (findPartnerUser) {
              if (findPartnerUser.roleId !== 3) {
                throw new HttpException(
                  { message: ERROR_MESSAGES.ACCOUNT_MANAGER_EMAIL_ALLOWED },
                  HttpStatus.BAD_REQUEST,
                );
              }
            } else {
              const password = await generatePassword();

              const userData = {
                email: partnerDetails.primaryContactEmail
                  ? partnerDetails.primaryContactEmail.toLowerCase()
                  : partnerDetails.primaryContactEmail,
                firstName: partnerDetails.primaryContactFirstName,
                lastName: partnerDetails.primaryContactLastName,
                roleId: 3,
                phoneNo: partnerDetails.primaryContactPhoneNo,
                organizationId: req.user.organizationId,
                isInvitedBy: req.user.id,
                isInvitationPending: true,
                status: StatusType.CHANGE_PASSWORD,
                password,
              };

              findPartnerUser = await this.userService.signUpUser(userData, tx);
              findPartnerUser.password = password;
            }
            opportunityObj.opportunityOwnerAccountManagerId =
              findPartnerUser.id;
          }

          opportunityObj.draftStage = OpportunityDraftStages.PARTNER;
        }

        if (configureAlert && opportunityObj.status === StatusType.DRAFT) {
          opportunityObj.draftStage = OpportunityDraftStages.CONFIGURE;
        }

        if (opportunityObj.status !== StatusType.DRAFT) {
          delete opportunityObj.draftStage;
        }

        if (opportunityData.opportunityReceiverId) {
          opportunityObj = {
            ...opportunityObj,
            opportunityReceiverId: opportunityData.opportunityReceiverId,
            opportunityReceivingOrganizationId:
              opportunityData.opportunityReceiverOrganizationId,
            updatedBy: req.user.id,
          };
        }

        const updateOpportunity = await this.update({
          where: { id: opportunityId },
          data: opportunityObj,
          tx,
        });

        //update salesforce opportunity
        if (opportunityInfo.salesforceOpportunityId) {
          const salesforceOpportunityObj: any = {
            Name: opportunityData.projectDetails.opportunity,
            CloseDate: opportunityData.projectDetails.targetCloseDate,
            Amount: opportunityData.projectDetails.value,
            Probability: opportunityData.projectDetails.probability,
            stageName: opportunityData?.projectDetails.stage,
            LeadSource: opportunityData.projectDetails.source,
            NextStep: opportunityData?.additionDetails?.nextStep,
          };

          if (opportunityData?.projectDetails.stage) {
            const stageInfo = await this.findOpportunityStage({
              stage: opportunityData?.projectDetails.stage,
            });
            salesforceOpportunityObj.stageName = stageInfo.salesforceStage;
          }

          this.salesForceService.updateSalesforceOpportunity(
            opportunityData.opportunityReceiverId,
            opportunityInfo.salesforceOpportunityId,
            salesforceOpportunityObj,
          );
        }
        if (configureAlert) {
          const findAlert = await tx.opportunityAlert.findFirst({
            where: { opportunityId },
          });

          if (!findAlert) {
            configureAlert.opportunityId = opportunityId;
            await tx.opportunityAlert.create({ data: configureAlert });
          } else {
            await tx.opportunityAlert.updateMany({
              data: configureAlert,
              where: { opportunityId: opportunityId },
            });
          }
        }

        if (findPartnerUser && opportunityData.opportunityReceiverId) {
          //sent alert to owner accountant
          await this.sentOpportunityAlertToOwnerAccountant(
            {
              opportunityId: opportunityInfo.id,
              opportunityOwnerAccountManagerId:
                opportunityObj.opportunityOwnerAccountManagerId,
            },
            findPartnerUser,
            tx,
          );
        }

        if (
          opportunityInfo.opportunityReceiverId &&
          opportunityData.opportunityReceiverId &&
          opportunityData.opportunityReceiverId !==
            opportunityInfo.opportunityReceiverId
        ) {
          await this.sentUpdateOpportunityInvite(
            {
              opportunityId: updateOpportunity.id,
              opportunityReceiverId: opportunityData.opportunityReceiverId,
              status: OpportunityStatus.PENDING,
            },
            opportunityInfo.opportunityReceiverId,
            tx,
          );
        } else if (opportunityData.opportunityReceiverId) {
          await this.sentOpportunityInvite(
            {
              opportunityId: opportunityInfo.id,
              opportunityReceiverId: opportunityData.opportunityReceiverId,
              status: OpportunityStatus.PENDING,
            },
            tx,
          );
        }

        return updateOpportunity;
      });
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  }

  async deleteOpportunity(opportunityId: number, userId: number) {
    try {
      const opportunityInfo = await this.getOpportunityDetails(
        Number(opportunityId),
      );

      if (!opportunityInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_OPPORTUNITY },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (opportunityInfo.opportunityOwnerUserId !== userId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_OPPORTUNITY },
          HttpStatus.FORBIDDEN,
        );
      }

      if (
        opportunityInfo.status !== StatusType.DRAFT &&
        opportunityInfo.status !== StatusType.PENDING
      ) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ACTIVE_OPPORTUNITY_ERROR },
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.opportunityAlert.deleteMany({
          where: { opportunityId: opportunityId },
        });

        if (opportunityInfo.opportunityReceiverId) {
          await this.deleteOpportunityInvite({
            where: {
              opportunityId_opportunityReceiverId: {
                opportunityId: opportunityInfo.id,
                opportunityReceiverId: opportunityInfo.opportunityReceiverId,
              },
            },
            tx,
          });
        }

        const deleteOpportunity = await tx.opportunity.delete({
          where: { id: opportunityId },
        });

        await tx.opportunityCustomer.delete({
          where: { id: opportunityInfo.opportunityCustomerId },
        });

        if (opportunityInfo.opportunityOwnerAccountManagerId) {
          const emailData = {
            opportunity: opportunityInfo.opportunity,
            name: opportunityInfo.opportunityOwnerAccountManager.firstName,
            customerCompanyName:
              opportunityInfo.opportunityCustomerUser.companyName,
            opportunityOwner: opportunityInfo.opportunityOwnerUser.firstName,
          };

          this.emailService.processEmail(
            'delete-opportunity',
            [opportunityInfo.opportunityOwnerAccountManager.email],
            emailData,
            EMAIL_SUBJECTS.DELETE_OPPORTUNITY,
          );

          if (opportunityInfo.opportunityReceiverId) {
            const receiverEmailData = {
              opportunity: opportunityInfo.opportunity,
              name: opportunityInfo.opportunityReceiver.firstName,
              customerCompanyName:
                opportunityInfo.opportunityCustomerUser.companyName,
              opportunityOwner: opportunityInfo.opportunityOwnerUser.firstName,
            };

            this.emailService.processEmail(
              'delete-opportunity',
              [opportunityInfo.opportunityReceiver.email],
              receiverEmailData,
              EMAIL_SUBJECTS.DELETE_OPPORTUNITY,
            );
          }
        }

        return deleteOpportunity;
      });
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      throw error;
    }
  }

  async sentOpportunityInvite(
    opportunityInvite: any,
    tx: Prisma.TransactionClient,
  ) {
    const findInvite = await this.prisma.opportunityInvite.findFirst({
      where: {
        opportunityId: opportunityInvite.opportunityId,
        opportunityReceiverId: opportunityInvite.opportunityReceiverId,
      },
    });

    if (!findInvite) {
      //sent opportunity invite
      const invitationData = await tx.opportunityInvite.create({
        data: opportunityInvite,
      });

      const opportunityInfo = await this.getOpportunityDetails(
        Number(opportunityInvite.opportunityId),
        tx,
      );

      const emailData = {
        opportunity: opportunityInfo.opportunity,
        name: opportunityInfo.opportunityReceiver.firstName,
        customerCompanyName:
          opportunityInfo.opportunityCustomerUser.companyName,
        opportunityOwner: opportunityInfo.opportunityOwnerUser.firstName,
        opportunityOwnerAccountManager:
          opportunityInfo.opportunityOwnerAccountManager.firstName,
        opportunityOwnerCompany:
          opportunityInfo.opportunityOwnerUser.organization.companyName,
      };

      this.emailService.processEmail(
        'opportunity-invite',
        [opportunityInfo.opportunityReceiver.email],
        emailData,
        EMAIL_SUBJECTS.ASSIGN_OPPORTUNITY,
      );

      return invitationData;
    }

    return findInvite;
  }

  async sentOpportunityAlertToOwnerAccountant(
    opportunityData: any,
    userData: User,
    tx?: Prisma.TransactionClient,
  ) {
    //assign account manager by sender partner
    const opportunityInfo = await this.getOpportunityDetails(
      Number(opportunityData.opportunityId),
      tx,
    );

    const emailData: any = {
      opportunity: opportunityInfo.opportunity,
      name: opportunityInfo.opportunityOwnerAccountManager.firstName,
      customerCompanyName: opportunityInfo.opportunityCustomerUser.companyName,
      opportunityOwner: opportunityInfo.opportunityOwnerUser.firstName,
      opportunityReceiver: opportunityInfo.opportunityReceiver.firstName,
      opportunityOwnerAccountManager:
        opportunityInfo.opportunityOwnerAccountManager.firstName,
      opportunityOwnerCompany:
        opportunityInfo.opportunityOwnerUser.organization.companyName,
      receivingCompany: opportunityInfo?.opportunityReceiverOrganization
        ? opportunityInfo?.opportunityReceiverOrganization.companyName
        : 'N/A',
    };

    if (userData.status === 'CHANGE_PASSWORD' && userData.password) {
      emailData.frontendUrl = process.env.FRONTEND_URL;
      emailData.password = userData.password;
      emailData.email = opportunityInfo.opportunityOwnerAccountManager.email;

      this.emailService.processEmail(
        'opportunity-assign-owner-accountant-and-create-account',
        [opportunityInfo.opportunityOwnerAccountManager.email],
        emailData,
        EMAIL_SUBJECTS.SHARE_OPPORTUNITY,
      );
    } else {
      this.emailService.processEmail(
        'opportunity-assign-owner-accountant',
        [opportunityInfo.opportunityOwnerAccountManager.email],
        emailData,
        EMAIL_SUBJECTS.SHARE_OPPORTUNITY,
      );
    }
  }

  async sentUpdateOpportunityInvite(
    opportunityInvite: any,
    oldOpportunityReceiverId: number,
    tx: Prisma.TransactionClient,
  ) {
    //sent opportunity invite
    const invitationData = await this.updateOpportunityInvite({
      where: {
        opportunityId_opportunityReceiverId: {
          opportunityId: opportunityInvite.opportunityId,
          opportunityReceiverId: oldOpportunityReceiverId,
        },
      },
      data: opportunityInvite,
      tx,
    });

    const opportunityInfo = await this.getOpportunityDetails(
      Number(opportunityInvite.opportunityId),
      tx,
    );

    const emailData = {
      opportunity: opportunityInfo.opportunity,
      name: opportunityInfo.opportunityReceiver.firstName,
      customerCompanyName: opportunityInfo.opportunityCustomerUser.companyName,
      opportunityOwner: opportunityInfo.opportunityOwnerUser.firstName,
      opportunityOwnerAccountManager:
        opportunityInfo.opportunityOwnerAccountManager.firstName,
      opportunityOwnerCompany:
        opportunityInfo.opportunityOwnerUser.organization.companyName,
    };

    this.emailService.processEmail(
      'opportunity-invite',
      [opportunityInfo.opportunityReceiver.email],
      emailData,
      EMAIL_SUBJECTS.ASSIGN_OPPORTUNITY,
    );

    return invitationData;
  }

  async deleteOpportunityInvite(params: {
    where: any;
    tx: Prisma.TransactionClient;
  }): Promise<OpportunityInvite> {
    const { where, tx } = params;
    try {
      const deletedInvite = await tx.opportunityInvite.delete({
        where,
      });
      return deletedInvite;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found, skip deletion
          return null;
        }
      }
      throw error;
    }
  }

  async getOpportunityDetails(
    opportunityId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: Number(opportunityId) },
      include: {
        opportunityCustomerUser: {
          select: {
            id: true,
            companyName: true,
            website: true,
            industry: true,
            city: true,
            state: true,
            address: true,
            country: true,
            postalCode: true,
            customerFirstName: true,
            customerLastName: true,
            customerEmail: true,
            customerPhoneNo: true,
          },
        },
        opportunityReceiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
            organizationId: true,
          },
        },
        opportunityOwnerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
            organizationId: true,
            organization: {
              select: {
                companyName: true,
                whatCrmPlatformUsed: true,
              },
            },
          },
        },
        OpportunityAlert: {
          select: {
            period: true,
            message: true,
          },
        },
        opportunityOriginOrganization: {
          select: {
            id: true,
            companyName: true,
          },
        },
        opportunityOwnerAccountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNo: true,
          },
        },
        opportunityAccountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        opportunityReceiverOrganization: {
          select: {
            id: true,
            companyName: true,
          },
        },
        OpportunityInvite: {
          select: {
            id: true,
            status: true,
            reason: true,
          },
        },
      },
    });

    return opportunity;
  }

  async updateInviteStatus(
    opportunityId: number,
    opportunityData: OpportunityInviteDTO,
  ) {
    const getOpportunity = await this.findOne({ id: opportunityId });

    if (!getOpportunity) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_OPPORTUNITY },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (getOpportunity.opportunityReceiverId !== opportunityData.userId) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.OPPORTUNITY_INVITE_ERROR,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const opportunityInviteData = {
      status: opportunityData.status,
      reason: '',
    };

    if (opportunityData.status === 'REJECT') {
      if (!opportunityData.reason) {
        throw new HttpException(
          {
            message: ERROR_MESSAGES.REJECT_INVITE_MESSAGE,
          },
          HttpStatus.FORBIDDEN,
        );
      }
      opportunityInviteData.reason = opportunityData.reason;
    }

    //assign account manager by receiver partner
    return await this.prisma.$transaction(async (tx) => {
      await this.updateOpportunityInvite({
        where: {
          opportunityId_opportunityReceiverId: {
            opportunityId: opportunityId,
            opportunityReceiverId: opportunityData.userId,
          },
        },
        data: opportunityInviteData,
        tx,
      });

      const assignAccountant = await this.update({
        where: { id: opportunityId },
        data: {
          status: opportunityData.status,
          opportunityAccountManagerId:
            opportunityData.opportunityAccountManagerId,
        },
        tx,
      });

      const opportunityInfo = await this.getOpportunityDetails(
        Number(opportunityId),
        tx,
      );

      if (
        opportunityData.opportunityAccountManagerId &&
        opportunityData.status === 'ACCEPT'
      ) {
        const emailData = {
          opportunity: opportunityInfo.opportunity,
          name: opportunityInfo.opportunityAccountManager.firstName,
          customerCompanyName:
            opportunityInfo.opportunityCustomerUser.companyName,
          opportunityReceiver: opportunityInfo.opportunityReceiver.firstName,
          receivingCompany:
            opportunityInfo.opportunityReceiverOrganization.companyName,
        };

        this.emailService.processEmail(
          'opportunity-assign-accountant',
          [opportunityInfo.opportunityAccountManager.email],
          emailData,
          EMAIL_SUBJECTS.SHARE_OPPORTUNITY,
        );
      }

      return assignAccountant;
    });
  }

  parseCsvData(csvData: string): Promise<BulkOpportunityDto[]> {
    return new Promise<BulkOpportunityDto[]>((resolve, reject) => {
      const opportunities: BulkOpportunityDto[] = [];
      const parser = csv.parse({ columns: true }, (error, records) => {
        if (error) {
          reject(
            new HttpException(
              {
                message: `${ERROR_MESSAGES.INVALID_DATA}csv format`,
              },
              HttpStatus.BAD_REQUEST,
            ),
          );
        } else {
          let i = 1;

          for (const record of records) {
            const opportunity = plainToClass(BulkOpportunityDto, record);
            opportunity.rowNumber = i;
            opportunities.push(opportunity);

            i++;
          }
          resolve(opportunities);
        }
      });

      parser.write(csvData);
      parser.end();
    });
  }

  async createBulkOpportunity(
    bulkOpportunity: BulkOpportunityDto[],
    req: any,
  ): Promise<boolean | HttpException> {
    try {
      for (const data of bulkOpportunity) {
        const opportunitiesObj = {
          customerDetails: {
            companyName: data.customerCompanyName,
            website: data.customerCompanyWebsite,
            industry: data.customerCompanyIndustry,
            city: data.customerCompanyCity,
            state: data.customerCompanyState,
            address: data.customerCompanyAddress,
            country: data.customerCompanyCountry,
            postalCode: data.customerCompanyPostalCode,
            customerFirstName: data.customerFirstName,
            customerLastName: data.customerLastName,
            customerEmail: data.customerEmail,
            customerPhoneNo: data.customerPhoneNo,
          },
          projectDetails: {
            opportunity: data.opportunity,
            type: data.type,
            solutionOffered: data.solutionOffered,
            businessProblem: data.businessProblem,
            stage: data.stage,
            useCase: data.useCase,
            targetCloseDate: convertToDateTime(data.targetCloseDate),
            value: data.value,
            source: data.source,
            probability: data.probability,
            deliveryModel: data.deliveryModel,
            isFulfilledThroughMarketplace: data.isFulfilledThroughMarketplace,
          },
          additionDetails: {
            doYouNeedSupportFromPartnerCompany:
              data.doYouNeedSupportFromPartnerCompany,
            typeOfSupportNeedFromPartnerCompany:
              data.typeOfSupportNeedFromPartnerCompany,
            nextStep: data.nextStep,
          },
          partnerDetails: {
            primaryContactEmail: data.partnerEmail,
            primaryContactFirstName: data.partnerFirstName,
            primaryContactLastName: data.partnerLastName,
            primaryContactPhoneNo: data.partnerPhoneNo,
          },
          configureAlert: {
            period: data.alertPeriod,
            message: data.alertMessage,
            opportunityId: 1,
          },
          status: StatusType.DRAFT,
        };

        await this.createOpportunity(opportunitiesObj, req);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  getOpportunityStages() {
    return this.prisma.opportunityStages.findMany({
      select: {
        stage: true,
        probability: true,
      },
    });
  }

  findOpportunityStage(where: any) {
    return this.prisma.opportunityStages.findFirst({
      select: {
        stage: true,
        probability: true,
        salesforceStage: true,
      },
      where,
    });
  }

  async fetchOpportunityAlertAndSentNotification() {
    const opportunityAlert = await this.prisma.opportunityAlert.findMany({
      where: {
        status: OpportunityAlertStatus.ACTIVE,
        OR: [
          {
            opportunity: {
              status: OpportunityStatus.PENDING,
            },
          },
          {
            opportunity: {
              status: OpportunityStatus.ACCEPT,
            },
          },
        ],
      },
      include: {
        opportunity: {
          select: {
            id: true,
            probability: true,
            status: true,
            opportunityReceiverId: true,
            opportunityAccountManagerId: true,
            opportunityOwnerUserId: true,
            opportunityOwnerAccountManagerId: true,
            targetCloseDate: true,
            OpportunityInvite: {
              select: {
                status: true,
                opportunityReceiverId: true,
              },
            },
          },
        },
      },
    });

    const bulkNotificationArr = [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const data of opportunityAlert) {
      const notificationDate = calculateNotificationDate(
        data.opportunity.targetCloseDate,
        data.period,
      );
      notificationDate.setHours(0, 0, 0, 0);

      if (notificationDate <= currentDate) {
        bulkNotificationArr.push({
          resourceId: data.opportunityId,
          userId: data.opportunity.opportunityReceiverId,
          type: NotificationType.OPPORTUNITY,
          message: data.message,
        });
      }
    }

    await this.sentOpportunityNotification(bulkNotificationArr);
  }

  async sentOpportunityNotification(data: CreateNotificationDto[]) {
    const notificationSent = await this.notificationService.bulkCreate(data);
    return notificationSent;
  }
}
