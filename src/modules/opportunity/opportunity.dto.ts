import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OpportunityType, StatusType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

export interface customerInfo {
  companyName: string;
  website: string;
  industry: string;
  city: string;
  state: string;
  address: string;
  country: string;
  postalCode: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhoneNo?: string;
}

export interface projectInfo {
  opportunity: string;
  type: OpportunityType;
  solutionOffered: string;
  businessProblem: string;
  stage: string;
  useCase: string;
  targetCloseDate: string;
  value: string;
  source: string;
  probability: string;
  deliveryModel: string;
  isFulfilledThroughMarketplace: boolean;
  salesforceOpportunityId?: string;
}

export interface additionalInfo {
  doYouNeedSupportFromPartnerCompany: string;
  typeOfSupportNeedFromPartnerCompany: string;
  nextStep: string;
}

export interface partnerInfo {
  companyName?: string;
  companyId?: number;
  primaryContactFirstName?: string;
  primaryContactLastName?: string;
  primaryContactEmail?: string;
  primaryContactPhoneNo?: string;
}

export class OpportunityDTO {
  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      companyName: 'Acme Corp',
      website: 'https://www.acme.com',
      industry: 'Technology',
      city: 'San Francisco',
      state: 'CA',
      address: '123 Market Street',
      country: 'USA',
      postalCode: '94103',
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'john.doe@acme.com',
      customerPhoneNo: '+1-800-555-1234',
    },
  })
  customerDetails?: customerInfo;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      opportunity: 'New E-commerce Platform',
      type: OpportunityType.NEW_BUSINESS,
      solutionOffered: 'Custom E-commerce Solution',
      businessProblem:
        'Existing e-commerce platform is outdated and lacks scalability',
      stage: 'Proposal',
      useCase: 'E-commerce',
      targetCloseDate: new Date('2024-06-30'),
      value: '$250,000',
      source: 'Referral',
      probability: '60%',
      deliveryModel: 'Onsite',
      isFulfilledThroughMarketplace: false,
    },
  })
  projectDetails?: projectInfo;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      doYouNeedSupportFromPartnerCompany: 'Yes',
      typeOfSupportNeedFromPartnerCompany: 'Integration with existing systems',
      nextStep: 'Schedule a meeting with the technical team',
    },
  })
  additionDetails?: additionalInfo;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      companyName: 'Partner Corp',
      primaryContactFirstName: 'Jane',
      primaryContactLastName: 'Smith',
      primaryContactEmail: 'jane.smith@partner.com',
      primaryContactPhoneNo: '+1-800-555-5678',
    },
  })
  partnerDetails?: partnerInfo;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: {
      period: '12 hours before',
      message: 'Please provide an update on the project status.',
    },
  })
  configureAlert?: {
    opportunityId: number;
    period: string;
    message: string;
  };

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  opportunityReceiverId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  opportunityReceiverOrganizationId?: number;

  @ApiProperty({
    required: false,
    enum: StatusType,
    description: 'Status of Opportunity',
  })
  @IsOptional()
  status?: StatusType;

  opportunityOwnerAccountManagerId?: number;
}

export class FilterOpportunityDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. John)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    enum: StatusType,
    description: 'Status to filter Opportunity',
  })
  status?: StatusType;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: String,
    description: 'stage to filter Opportunity (eg. negotiate)',
  })
  stage?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Opportunity (eg. 30, 60, 90)',
  })
  date?: number;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'Partner Organization Id',
  })
  partnerOrganizationId?: number;
}

export class OpportunityInviteDTO {
  @ApiProperty({
    required: true,
    enum: ['ACCEPT', 'REJECT'],
    description: 'Accept or reject opportunity',
  })
  @IsEnum(StatusType)
  status: StatusType;

  @ApiProperty({
    required: false,
    type: String,
    description: 'Enter reason incase of reject',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'Assign account manager',
  })
  @IsNumber()
  opportunityAccountManagerId?: number;

  userId: number;
}
export class BulkOpportunityDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyWebsite: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyIndustry: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyCity: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyState: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyCountry: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerCompanyPostalCode: string;

  @IsNotEmpty()
  @ApiProperty()
  customerFirstName: string;

  @ApiProperty()
  customerLastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerEmail: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerPhoneNo: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  opportunity: string;

  @ApiProperty()
  @IsNotEmpty()
  type: OpportunityType;

  @ApiProperty()
  solutionOffered: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  businessProblem: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  stage: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  useCase: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  targetCloseDate: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  source: string;

  @ApiProperty()
  probability: string;

  @ApiProperty()
  deliveryModel: string;

  @ApiProperty()
  @Transform(({ value }) =>
    value === 'TRUE' || 'true'
      ? true
      : value === 'FALSE' || 'False'
      ? false
      : value,
  )
  isFulfilledThroughMarketplace: boolean;

  @ApiProperty()
  doYouNeedSupportFromPartnerCompany: string;

  @ApiProperty()
  typeOfSupportNeedFromPartnerCompany: string;

  @ApiProperty()
  nextStep: string;

  @ApiProperty()
  @IsString()
  @IsEmail({}, { message: ERROR_MESSAGES.INVALID_EMAIL })
  partnerEmail: string;

  @ApiProperty()
  @IsString()
  partnerFirstName: string;

  @ApiProperty()
  @IsString()
  partnerLastName: string;

  @ApiProperty()
  partnerPhoneNo: string;

  @ApiProperty()
  alertPeriod: string;

  @ApiProperty()
  alertMessage: string;

  @ApiProperty()
  rowNumber: number;

  @ValidateNested()
  @Type(() => BulkOpportunityDto)
  opportunities: BulkOpportunityDto[];
}

export class BulkUploadOpportunityDto {
  @ApiProperty()
  @IsNotEmpty()
  companyId: number;

  @ApiProperty()
  @IsNotEmpty()
  opportunityReceiverId: number;
}

export class UpdateBulkUploadOpportunityDto {
  @ApiProperty({ example: '1,2,3' })
  @IsNotEmpty()
  opportunityIds: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  stage: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  probability: string;
}
