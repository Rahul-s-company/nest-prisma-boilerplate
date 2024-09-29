import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { MAX_PAGE_LIMIT } from '../constants/global.constants';

export class OrderByAndPaginationDTO {
  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    type: String,
    description: 'Field to order by',
  })
  orderBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Order direction (asc or desc)',
  })
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({
    required: false,
    type: Number,
    description: 'Page number',
    default: 1,
  })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({
    required: false,
    type: Number,
    description: 'Number of items per page',
    default: 1000,
  })
  pageSize?: number = MAX_PAGE_LIMIT;
}
