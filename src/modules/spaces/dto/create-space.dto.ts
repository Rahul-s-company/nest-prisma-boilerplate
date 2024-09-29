import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpaceDto {
  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @ApiProperty()
  @IsNotEmpty()
  spaceParentId: number;
}
