import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OpportunityType } from '@prisma/client';

export class SalesforceAuthRequestDTO {
  @IsString()
  @ApiProperty()
  accessToken: string;

  @IsString()
  @ApiProperty()
  instanceUrl: string;
}
export class SalesforceAuthResponseDTO {
  @IsString()
  @ApiProperty()
  accessToken: string;

  @IsString()
  @ApiProperty()
  refreshToken: string;

  @IsString()
  @ApiProperty()
  instanceUrl: string;
}

export class SalesforceUpsertTokenDTO {
  @IsString()
  @ApiProperty()
  accessToken: string;

  @IsString()
  @ApiProperty()
  refreshToken: string;

  @IsNumber()
  @ApiProperty()
  userId: number;

  @IsString()
  @ApiProperty()
  type: string;
}

export class SalesforceCredentials {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  id?: number;
}

export class SalesforceStageSyncDTO {
  @ApiProperty()
  @IsArray()
  stages: string[];

  @ApiProperty()
  @IsArray()
  salesforceStages: string[];
}

export class OpportunityUpdateDto {
  @ApiProperty({ required: false, description: 'The name of the opportunity' })
  @IsOptional()
  @IsString()
  Name?: string;

  @ApiProperty({ required: false, description: 'The stage of the opportunity' })
  @IsOptional()
  @IsString()
  @IsIn([
    'Prospecting',
    'Qualification',
    'Needs Analysis',
    'Value Proposition',
    'Id. Decision Makers',
    'Perception Analysis',
    'Proposal/Price Quote',
    'Negotiation/Review',
    'Closed Won',
    'Closed Lost',
  ])
  StageName?: string;

  @ApiProperty({
    required: false,
    description: 'The close date of the opportunity (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  CloseDate?: string;

  @ApiProperty({
    required: false,
    description: 'The amount of the opportunity',
  })
  @IsOptional()
  @IsString()
  Amount?: string;

  @ApiProperty({
    required: false,
    description: 'The probability of winning the opportunity',
  })
  @IsOptional()
  @IsString()
  Probability?: string;

  @ApiProperty({ required: false, description: 'The type of opportunity' })
  @IsOptional()
  @IsString()
  @IsIn(['Existing Business', 'New Business'])
  Type?: string;

  @ApiProperty({
    required: false,
    description: 'The lead source of the opportunity',
  })
  @IsOptional()
  @IsString()
  LeadSource?: string;

  @ApiProperty({
    required: false,
    description: 'The next step in the opportunity process',
  })
  @IsOptional()
  @IsString()
  NextStep?: string;
}

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
  solutionOffered?: string;
  businessProblem?: string;
  stage: string;
  useCase?: string;
  targetCloseDate: string | Date;
  value: string;
  source: string;
  probability: string;
  deliveryModel?: string;
  isFulfilledThroughMarketplace?: boolean;
  salesforceOpportunityId?: string;
}

export class SyncOpportunityDTO {
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
}
