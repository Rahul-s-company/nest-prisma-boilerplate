import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AssetFolder,
  AssetFolderType,
  Prisma,
  StatusType,
} from '@prisma/client';
import { S3Service } from 'src/shared/services';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';

import { PrismaService } from '../prisma/prisma.service';

import {
  AssetCreateFolderDTO,
  AssetDetail,
  AssetUploadDto,
  RenameFileDto,
  deleteAssetsDto,
} from './asset.dto';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService, private s3Service: S3Service) {}

  async uploadFileTos3(file, assetUploadDto: AssetUploadDto) {
    if (assetUploadDto.assetType === AssetFolderType.GOAL) {
      if (!assetUploadDto.initiativeId) {
        throw new HttpException(
          {
            message: ERROR_MESSAGES.INITIATIVE_REQURIED,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: assetUploadDto.planId,
      },
    });

    if (!plan) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_PLAN,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.uploadSameFileName(file, assetUploadDto);

    let initiative;
    if (
      assetUploadDto.assetType === AssetFolderType.GOAL &&
      assetUploadDto.initiativeId
    ) {
      initiative = await this.prisma.initiative.findFirst({
        where: {
          id: assetUploadDto.initiativeId,
        },
      });

      if (!initiative) {
        throw new HttpException(
          {
            message: ERROR_MESSAGES.INVALID_INITIATIVE,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }
    const url = await this.s3Service.uploadFile(
      file,
      assetUploadDto,
      plan,
      initiative,
    );

    try {
      const createAsset = await this.createAssetRepo(assetUploadDto, url, file);

      if (createAsset) {
        return new ResponseSuccess('Asset uploaded Successfully', createAsset);
      }
    } catch (error) {
      // Handle any errors that occur during the asset creation process
      console.error('Error creating asset repo:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createAssetRepo(
    data: AssetUploadDto,
    assetUrl: string,
    fileName: { originalname: string; size: number },
  ) {
    return this.prisma.assetsRepo.create({
      data: {
        assetType: data.assetType,
        assetUrl: assetUrl,
        status: StatusType.ACTIVE,
        plan: {
          connect: { id: data.planId },
        },
        ownerUser: {
          connect: { id: data.ownerUserId },
        },
        assetRepoSourceId: data.assetRepoSourceId,
        fileName: fileName.originalname,
        initiativeId: data.initiativeId,
        size: fileName.size,
      },
    });
  }

  async downloadFile(id: number) {
    const assetDetail = await this.findOne(id);

    if (!assetDetail) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_ASSET,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const url = await this.s3Service.downloadFile(assetDetail.assetUrl);

      if (url) {
        return new ResponseSuccess('Asset download Successfully', url);
      }
    } catch (error) {
      console.error('Error download asset repo:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(id: number) {
    const assetDetail = await this.findOne(id);

    if (!assetDetail) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_ASSET,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const deleteSuccessMessage = await this.s3Service.deleteFile(
        assetDetail.assetUrl,
      );

      if (deleteSuccessMessage) {
        const deleteAsset = await this.prisma.assetsRepo.delete({
          where: {
            id: id,
          },
        });

        if (deleteAsset) {
          return new ResponseSuccess('Asset deleted Successfully');
        }
      }
    } catch (error) {
      console.error('Error download asset repo:', error);
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllAsset(params: {
    where?: Prisma.AssetFolderWhereInput;
  }): Promise<AssetFolder[]> {
    try {
      const { where } = params;
      const allAsset = await this.prisma.assetFolder.findMany({
        where: where,
      });
      const planIds = allAsset.map((asset) => asset.planId);

      // Step 3: Fetch file counts grouped by planId
      const fileCounts = await this.prisma.assetsRepo.groupBy({
        by: ['planId'],
        where: {
          planId: { in: planIds },
        },
        _count: {
          _all: true,
        },
      });
      const fileCountMap = fileCounts.reduce((acc, curr) => {
        acc[curr.planId] = curr._count._all;
        return acc;
      }, {});
      const allAssetWithFileCounts = allAsset.map((asset) => ({
        ...asset,
        fileCount: fileCountMap[asset.planId] || 0, // Default to 0 if no files found
      }));

      return allAssetWithFileCounts;
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number) {
    return await this.prisma.assetsRepo.findFirst({
      where: {
        id: id,
      },
    });
  }

  async getPlanAssetByIdAndType(
    id: number,
    type: AssetFolderType,
    assetResourceId: number,
    searchString?: string,
  ): Promise<{ files: AssetDetail[]; folders: any[]; count: number }> {
    const searchCondition: Prisma.StringFilter = searchString
      ? {
          contains: searchString,
          mode: 'insensitive', // Use the QueryMode enum for type safety
        }
      : undefined;

    const plan = await this.prisma.plan.findFirst({
      where: {
        id: id,
      },
    });

    if (!plan) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_PLAN,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const assetDetail = await this.prisma.assetsRepo.findMany({
      where: {
        planId: id,
        assetType: type,
        assetRepoSourceId: assetResourceId,
        fileName: searchCondition,
      },
    });
    let allAssetWithFileCounts = [];
    if (type !== AssetFolderType.GOAL) {
      const whereAccordingType: {
        planId: number;
        assetName: Prisma.StringFilter; // Assuming searchCondition is of type string
        type: AssetFolderType;
        initiativeId?: number; // Use the union type here
      } = {
        planId: id,
        assetName: searchCondition,
        type: AssetFolderType.INITIATIVE,
      };

      if (type === AssetFolderType.INITIATIVE) {
        whereAccordingType.type = AssetFolderType.GOAL;
        whereAccordingType.initiativeId = Number(assetResourceId);
      } else {
        whereAccordingType.type = AssetFolderType.INITIATIVE;
      }

      const planFolders = await this.prisma.assetFolder.findMany({
        where: whereAccordingType,
      });
      const resourceId = planFolders
        .map((asset) => asset.initiativeId)
        .filter((id) => id !== null);

      const fileCounts = await this.prisma.assetsRepo.groupBy({
        by: ['initiativeId'],
        where: {
          initiativeId: { in: resourceId },
        },
        _count: {
          _all: true,
        },
      });

      const fileCountMap = fileCounts.reduce((acc, curr) => {
        acc[curr.initiativeId] = curr._count._all;
        return acc;
      }, {});

      allAssetWithFileCounts = planFolders.map((asset) => ({
        ...asset,
        fileCount: fileCountMap[asset.initiativeId] || 0, // Default to 0 if no files found
      }));
    }
    return {
      files: assetDetail,
      folders: allAssetWithFileCounts,
      count: assetDetail.length,
    };
  }

  async createFolder(
    data: AssetCreateFolderDTO[],
    tx?: Prisma.TransactionClient,
  ): Promise<any> {
    const prisma = tx || this.prisma;

    const folderInfo = await prisma.assetFolder.createMany({
      data,
    });

    if (!folderInfo) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INTERNAL_ERR_MSG,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return folderInfo;
  }

  async renameFile(
    id: number,
    data: RenameFileDto,
    tx?: Prisma.TransactionClient,
  ): Promise<any> {
    const prisma = tx || this.prisma;
    const assetFound = await this.findOne(id);

    if (!assetFound) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INVALID_DATA + 'Asset' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const fileName = assetFound.fileName;
    const extension = fileName.substring(fileName.lastIndexOf('.')) || '';
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: data.planId,
      },
    });

    if (!plan) {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.INVALID_PLAN,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const nameIsAlreadyExist = await this.prisma.assetsRepo.findFirst({
      where: {
        planId: data.planId,
        assetType: data.assetType,
        fileName: `${data.fileName}${extension}`,
      },
    });

    if (!nameIsAlreadyExist) {
      try {
        const url = await this.s3Service.renameFile(
          assetFound.assetUrl,
          data,
          plan,
          `${data.fileName.trim()}${extension}`,
        );
        await prisma.assetsRepo.update({
          data: {
            fileName: `${data.fileName.trim()}${extension}`,
            assetUrl: url,
            updatedBy: data.updatedBy,
          },
          where: {
            id: id,
          },
        });
        return new ResponseSuccess(SUCCESS_MESSAGES.FILE_RENAME);
      } catch (error) {
        throw new HttpException(
          {
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else {
      throw new HttpException(
        {
          message: ERROR_MESSAGES.FILE_NAME_EXIST,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async deleteAssetFolder(planDetail: number) {
    await this.prisma.assetFolder.findFirst({
      where: {
        planId: planDetail,
      },
    });

    const deleteAssetRepoFiles = await this.prisma.assetsRepo.findMany({
      where: {
        planId: planDetail,
      },
    });

    if (deleteAssetRepoFiles.length) {
      for (const file of deleteAssetRepoFiles) {
        await this.deleteFile(file.id);
      }
    }

    await this.prisma.assetFolder.deleteMany({
      where: {
        planId: planDetail,
      },
    });

    return new ResponseSuccess(
      'Asset folder and related files deleted successfully',
    );
  }

  async deleteAssets(data: deleteAssetsDto, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;

    const deleteAssetRepoFiles = await prisma.assetsRepo.findMany({
      where: {
        assetRepoSourceId: data.assetSourceId,
        assetType: data.assetType,
      },
    });

    if (deleteAssetRepoFiles.length) {
      for (const file of deleteAssetRepoFiles) {
        await this.deleteFile(file.id);
      }
    }

    await prisma.assetFolder.deleteMany({
      where: {
        planId: data.planId,
        type: data.assetType,
        resourceId: data.assetSourceId,
      },
    });
  }

  async uploadSameFileName(file, assetUploadDto) {
    let fileName = file.originalname;
    const baseName =
      fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const extension = fileName.substring(fileName.lastIndexOf('.')) || '';

    // Fetch all potential conflicting file names in one query
    const conflictingFiles = await this.prisma.assetsRepo.findMany({
      where: {
        planId: assetUploadDto.planId,
        assetType: assetUploadDto.assetType,
        fileName: {
          startsWith: baseName.trim(), // Fetches files with the same base name
        },
      },
      select: { fileName: true }, // Select only fileName field
    });

    // Check if the exact file name exists
    if (conflictingFiles.some((file) => file.fileName === fileName)) {
      let counter = 1;
      let newFileName = `${baseName.trim()}(${counter})${extension}`;

      // Loop until we find a unique file name
      while (conflictingFiles.some((file) => file.fileName === newFileName)) {
        counter++;
        newFileName = `${baseName.trim()}(${counter})${extension}`;
      }

      fileName = newFileName;
    }

    file.originalname = fileName;
    return file;
  }
}
