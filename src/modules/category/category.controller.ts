import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { ResponseSuccess } from 'src/utils/response/response';
import { StatusType } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ResponseDTO } from '../auth/auth.dto';

import { CreateCategoryDto } from './category.dto';
import { CategoryService } from './category.service';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ description: 'Create a new category' })
  async create(
    @Req() req,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<ResponseDTO | HttpException> {
    createCategoryDto.createdBy = req.user.id;

    const category = await this.categoryService.create(createCategoryDto);

    if (!category) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return new ResponseSuccess('Category created successfully', category);
  }

  @Get()
  @ApiOperation({ description: 'List a category' })
  async findAll() {
    const categoryList = await this.categoryService.findAll({
      where: { status: StatusType.ACTIVE },
    });

    return new ResponseSuccess('Category list', categoryList);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
