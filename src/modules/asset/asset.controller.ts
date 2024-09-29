import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from 'src/shared/constants/global.constants';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';

import { AssetService } from './asset.service';
import {
  AssetUploadDto,
  FilterAssetForPlanAndIntiativeDto,
  GetAllPLanDto,
  RenameFileDto,
} from './asset.dto';

@ApiTags('asset')
@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Body() assetUploadDto: AssetUploadDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }), // File size in bytes
          new FileTypeValidator({ fileType: ALLOWED_FILE_TYPES }), // Allowed file types
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      return await this.assetService.uploadFileTos3(file, assetUploadDto);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string) {
    try {
      return await this.assetService.downloadFile(+id);
    } catch (error) {
      console.error('Error Downloading file:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    try {
      return await this.assetService.deleteFile(+id);
    } catch (error) {
      console.error('Error Downloading file:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* Get all Plan Folders */
  @Get()
  async findAllAsset(@Query() filterAssetDto: GetAllPLanDto) {
    const filterWhere: Prisma.AssetFolderWhereInput = {}; // Initialize as an empty object

    if (filterAssetDto.searchString) {
      filterWhere.AND = {
        assetName: {
          contains: filterAssetDto.searchString,
          mode: 'insensitive', // Case-insensitive search
        },
      };
    }
    filterWhere.partnerId = parseInt(filterAssetDto.partnerId, 10);
    filterWhere.type = filterAssetDto.type;
    return await this.assetService.getAllAsset({ where: filterWhere });
  }

  /* Get all Plan files and initiative folders */
  @Get('plan/asset-detail/:id')
  async getPlanAssetById(
    @Param('id') id: string,
    @Query() filterAssetDto: FilterAssetForPlanAndIntiativeDto,
  ) {
    try {
      const { type, searchString, assetResourceId } = filterAssetDto;
      const assetDetail = await this.assetService.getPlanAssetByIdAndType(
        +id,
        type,
        +assetResourceId,
        searchString,
      );
      return assetDetail;
    } catch (error) {
      console.error('Error fetching asset detail:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('rename/:id')
  async renameFile(
    @Param('id') id: string,
    @Req() req,
    @Body() renameFileDto: RenameFileDto,
  ) {
    renameFileDto.updatedBy = req.user.id;
    return await this.assetService.renameFile(+id, renameFileDto);
  }
}
