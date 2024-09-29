import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as jsforce from 'jsforce';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { OpportunityType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { createOAuth2Instance } from './sales-force.utils';
import {
  OpportunityUpdateDto,
  SalesforceAuthResponseDTO,
  SalesforceStageSyncDTO,
  SyncOpportunityDTO,
} from './sales-force.dto';

@Injectable()
export class SalesForceService {
  constructor(private prisma: PrismaService) {}
  logger = new Logger(SalesForceService.name);

  async getAuthorizationUrl() {
    const oauth2 = createOAuth2Instance();
    return oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' });
  }

  async getAccessToken(code: string) {
    const oauth2 = createOAuth2Instance();
    const conn = new jsforce.Connection({ oauth2 });
    try {
      await conn.authorize(code);
      return {
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        instanceUrl: conn.instanceUrl,
      };
    } catch (err) {
      throw err;
    }
  }

  async getTokenIdentityOrRefresh(userId: number) {
    const tokenData: any = await this.findToken({
      userId: userId,
      type: 'salesforce',
    });

    if (!tokenData) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_SALESFORCE_LOGIN },
        HttpStatus.CONFLICT,
      );
    }

    const { accessToken, refreshToken, instanceUrl } = tokenData;

    const conn = new jsforce.Connection({
      accessToken,
      instanceUrl,
    });

    try {
      // Try to use the current access token
      this.logger.log('getting existing access token');
      await conn.identity();
    } catch (err) {
      // If the access token is expired, retrieve a new one using the refresh token
      if (err.errorCode === 'INVALID_SESSION_ID') {
        this.logger.log('getting new access token');

        const oauth2 = createOAuth2Instance();
        const newAccessToken: any = await oauth2.refreshToken(refreshToken);
        const accessToken = newAccessToken.access_token;

        await this.prisma.token.update({
          data: { accessToken: accessToken },
          where: {
            id: tokenData.id,
          },
        });
        const conn = new jsforce.Connection({
          accessToken,
          instanceUrl,
        });

        return conn;
      } else {
        throw err;
      }
    }

    // If the access token is still valid, return the original credentials
    return conn;
  }

  async getUserAndOrganizationDetails(
    accessToken: string,
    instanceUrl: string,
  ) {
    try {
      const conn = new jsforce.Connection({
        accessToken,
        instanceUrl,
      });

      return new Promise<{ userInfo: any; organizationDetails: any }>(
        async (resolve, reject) => {
          const userInfo = await conn.identity();
          const organization = await conn
            .sobject('Organization')
            .retrieve(userInfo.organization_id);

          if (organization) {
            resolve({
              userInfo,
              organizationDetails: organization,
            });
          }

          reject(ERROR_MESSAGES.INTERNAL_ERR_MSG);
        },
      );
    } catch (err) {
      throw err;
    }
  }

  async findToken(cond: Prisma.TokenWhereInput) {
    return this.prisma.token.findFirst({
      where: cond,
    });
  }

  async upsertSalesforceToken(
    tokenInfo: SalesforceAuthResponseDTO,
    userId: number,
  ) {
    const type = 'salesforce';
    const updateObj: any = {
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      instanceUrl: tokenInfo.instanceUrl,
      userId: userId,
      type: type,
    };

    const tokenData = await this.findToken({ userId: userId, type: type });

    if (!tokenData) {
      await this.prisma.token.create({ data: updateObj });
    } else {
      await this.prisma.token.update({
        data: updateObj,
        where: {
          id: tokenData.id,
        },
      });
    }
  }

  async getOpportunityStageList(userId: number) {
    const conn: any = await this.getTokenIdentityOrRefresh(userId);

    try {
      const metadata = await conn.describe('Opportunity');
      const stageField = metadata.fields.find(
        (field) => field.name === 'StageName',
      );

      if (stageField && stageField.picklistValues) {
        const stageList = stageField.picklistValues.map((value) => value.label);
        return stageList;
      } else {
        throw new HttpException(
          { message: 'Could not find Opportunity StageName field' },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw err;
    }
  }

  async getOpportunityList(userId: number) {
    const conn = await this.getTokenIdentityOrRefresh(userId);
    try {
      // Query opportunities
      const opportunities = await conn
        .sobject('Opportunity')
        .select(
          'Id, Name, AccountId, OwnerId, Amount, StageName, CloseDate, Probability ,Type , NextStep , LeadSource , Account.Name, Account.Industry, Owner.Name, Owner.Email',
        )
        .execute();

      return opportunities;
    } catch (error) {
      this.logger.error(
        'Error retrieving opportunities from Salesforce:',
        error,
      );
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      // Disconnect from Salesforce
      conn.logout();
    }
  }

  async getOpportunityDetail(userId: number, opportunityId: string) {
    // Get a valid connection
    const conn = await this.getTokenIdentityOrRefresh(userId);
    try {
      // Fetch the opportunity with related Account and Owner (User) details
      const opportunity = await conn
        .sobject('Opportunity')
        .select(
          'Id, Name, AccountId, OwnerId, Amount, StageName, CloseDate, Probability ,Type , NextStep , LeadSource , Account.Name, Account.Type, Account.Industry, Account.Website, Account.Phone, Account.BillingCity,Account.BillingState, Account.BillingPostalCode, Account.BillingCountry',
        )
        .where({ Id: opportunityId })
        .execute();

      const result: any = opportunity[0];

      const contactResult = await conn
        .sobject('Contact')
        .select('Id, FirstName, LastName, Email, Phone, Title')
        .where({ AccountId: result.AccountId })
        .sort({ CreatedDate: -1 })
        .limit(1)
        .execute();

      const contact: any = contactResult[0] || {};

      // Restructure the result for better organization

      if (result.Type === 'New Customer') {
        result.Type = OpportunityType.NEW_BUSINESS;
      } else {
        result.Type = OpportunityType.RENEW_NO_UPSELL;
      }

      const stageInfo = await this.prisma.opportunityStages.findFirst({
        select: {
          stage: true,
        },
        where: { salesforceStage: result.StageName },
      });

      const restructuredResult: SyncOpportunityDTO = {
        projectDetails: {
          salesforceOpportunityId: result.Id,
          opportunity: result.Name,
          value: result.Amount.toString(),
          stage: stageInfo.stage,
          targetCloseDate: result.CloseDate ? new Date(result.CloseDate) : null,
          probability: result.Probability.toString(),
          type: result.Type,
          source: result.LeadSource,
        },
        customerDetails: {
          companyName: result.Account?.Name,
          industry: result.Account?.Industry,
          website: result.Account?.Website,
          address: result.Account?.BillingStreet,
          city: result.Account?.BillingCity,
          state: result.Account?.BillingState,
          postalCode: result.Account?.BillingPostalCode,
          country: result.Account?.BillingCountry,
          customerFirstName: contact?.FirstName,
          customerLastName: contact?.LastName,
          customerEmail: contact?.Email,
          customerPhoneNo: contact?.Phone,
        },
        // additionalDetails: {
        //   nextStep: result.NextStep,
        // },
      };

      if (!result) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_OPPORTUNITY },
          HttpStatus.CONFLICT,
        );
      }

      return restructuredResult;
    } catch (error) {
      this.logger.error(
        `Error fetching opportunity ${opportunityId} with details: ${error.message}`,
      );

      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_OPPORTUNITY },
        HttpStatus.CONFLICT,
      );
    }
  }

  SyncOpportunityStages(userId: number, stageData: SalesforceStageSyncDTO) {
    const stagesMapping = stageData.stages.map((stage, index) => {
      return { stage, salesforceStage: stageData.salesforceStages[index] };
    });

    const dataObj = {
      userId,
      stagesMapping,
    };

    return this.prisma.salesforceStageSync.create({ data: dataObj });
  }

  GetSyncOpportunityStages(userId: number) {
    return this.prisma.salesforceStageSync.findFirst({
      where: { userId: userId },
    });
  }

  async updateSalesforceOpportunity(
    userId: number,
    opportunityId: string,
    updateData: Partial<OpportunityUpdateDto>,
  ) {
    const conn = await this.getTokenIdentityOrRefresh(userId);

    try {
      // Update the opportunity
      const result = await conn.sobject('Opportunity').update({
        Id: opportunityId,
        ...updateData,
      });

      if (result.success) {
        this.logger.log(`Successfully updated opportunity: ${opportunityId}`);
        return { success: true, id: opportunityId };
      } else {
        throw new Error('Update operation failed');
      }
    } catch (error) {
      this.handleSalesforceError(error, opportunityId, 'update');
    }
  }

  private handleSalesforceError(
    error: any,
    opportunityId: string,
    operation: string,
  ) {
    this.logger.error(
      `Error ${operation} opportunity ${opportunityId}: ${error.message}`,
    );

    if (
      error.errorCode === 'INVALID_ID_FIELD' ||
      error.errorCode === 'MALFORMED_ID'
    ) {
      throw new BadRequestException(`Invalid Opportunity ID: ${opportunityId}`);
    }

    if (error.errorCode === 'ENTITY_IS_DELETED') {
      throw new NotFoundException(
        `Opportunity with ID ${opportunityId} was deleted`,
      );
    }

    if (error.errorCode === 'INSUFFICIENT_ACCESS_OR_READONLY') {
      throw new BadRequestException(
        'Insufficient permissions to update this opportunity',
      );
    }

    // For any other Salesforce specific errors
    if (error.errorCode) {
      throw new BadRequestException(
        `Salesforce error: ${error.errorCode} - ${error.message}`,
      );
    }

    // For any other unexpected errors
    throw new Error(`Failed to ${operation} opportunity: ${error.message}`);
  }

  async syncOpportunityDetailFromSalesforce() {
    try {
      const opportunityList = await this.prisma.opportunity.findMany({
        where: { salesforceOpportunityId: { not: null } },
      });

      for (const opportunity of opportunityList) {
        const opportunityDetail = await this.getOpportunityDetail(
          opportunity.opportunityOwnerUserId,
          opportunity.salesforceOpportunityId,
        );

        if (opportunityDetail.customerDetails) {
          opportunityDetail.customerDetails.customerEmail = opportunityDetail
            .customerDetails.customerEmail
            ? opportunityDetail.customerDetails.customerEmail.toLowerCase()
            : opportunityDetail.customerDetails.customerEmail;

          await this.prisma.opportunityCustomer.update({
            data: opportunityDetail.customerDetails,
            where: { id: opportunity.opportunityCustomerId },
          });
        }

        if (opportunityDetail.projectDetails) {
          await this.prisma.opportunity.update({
            where: { id: opportunity.id },
            data: opportunityDetail.projectDetails,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error sync opportunities from Salesforce:', error);
    }
  }
}
