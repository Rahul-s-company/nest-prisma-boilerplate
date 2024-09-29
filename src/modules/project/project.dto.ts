import { ApiProperty } from '@nestjs/swagger';
import { ProgressStatus } from '@prisma/client';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrderByAndPaginationDTO } from 'src/shared/dto/orderAndPagination.dto';

interface ProjectActivityDetail {
  ownerId: number;
  name: string;
  tag?: string;
  estimatedCompletionDate: string;
  description: string;
  status: ProgressStatus;
  id?: number;
}

export class CreateProjectDto {
  @ApiProperty({ description: 'The name of the project' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The ID of the plan', type: Number })
  @IsNumber()
  planId: number;

  @ApiProperty({ description: 'The ID of the partner', type: Number })
  @IsNumber()
  partnerId: number;

  @ApiProperty({ description: 'The IDs of initiative' })
  @IsString()
  initiativeId: string;

  @ApiProperty({ description: 'The IDs of goal' })
  @IsString()
  @IsOptional()
  goalId?: string;

  @ApiProperty({ description: 'Description of the project' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'owner Id' })
  @IsOptional()
  ownerId?: number;

  createdBy?: number;

  @IsArray()
  @ApiProperty({
    example: [
      {
        name: 'Create a Activity',
        tag: 'IT',
        estimatedCompletionDate: new Date('2024-07-24'),
        description: 'goal describe here',
        ownerId: 1,
        status: 'NOT_STARTED',
      },
    ],
  })
  projectActivity: ProjectActivityDetail[];
}

export class UpdateProjectDto {
  @ApiProperty({ description: 'The name of the project' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The ID of the plan', type: Number })
  @IsNumber()
  @IsOptional()
  planId?: number;

  @ApiProperty({ description: 'The IDs of initiative' })
  @IsString()
  @IsOptional()
  initiativeId?: string;

  @ApiProperty({ description: 'The IDs of goal' })
  @IsString()
  @IsOptional()
  goalId?: string;

  @ApiProperty({ description: 'Description of the project' })
  @IsString()
  @IsOptional()
  description?: string;

  updatedBy?: number;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: [
      {
        name: 'Create or update Activity',
        tag: 'IT',
        estimatedCompletionDate: new Date('2024-07-24'),
        description: 'goal describe here',
        ownerId: 1,
        status: 'NOT_STARTED',
      },
    ],
  })
  projectActivity?: ProjectActivityDetail[];
}

export class FilterProjectDto extends OrderByAndPaginationDTO {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'search value (e.g. New Plan)',
  })
  searchString?: string;

  @IsOptional()
  @ApiProperty({
    required: false,
    type: Number,
    description: 'date to filter Opportunity (eg. 30, 60, 90)',
  })
  date?: number;
}
