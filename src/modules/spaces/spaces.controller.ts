import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../core/decorators/permission.decorator';

import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';

@ApiTags('spaces')
@Controller('/spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @ApiOperation({ description: 'create module for permission feature' })
  async create(@Body() createSpace: CreateSpaceDto) {
    try {
      return await this.spacesService.create(createSpace);
    } catch (error) {
      throw new HttpException(
        { meassage: 'Module Already exist' },
        HttpStatus.CONFLICT,
      );
    }
  }

  @Get()
  @ApiOperation({ description: 'get all available module list' })
  findAll() {
    return this.spacesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ description: 'update module name' })
  @Permissions({ operation: 'read', spaceId: 3 })
  @ApiParam({ name: 'id', required: true })
  async getSpace(@Param('id') id: number) {
    return this.spacesService.findOne({ id: Number(id) });
  }
}
