import * as fs from 'fs';

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GLOBAL_CONFIG } from 'src/configs/global.config';
import { AssetUploadDto, RenameFileDto } from 'src/modules/asset/asset.dto';
import { AssetFolderType } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  logger = new Logger(S3Service.name);

  constructor() {
    this.s3Client = new S3Client({
      // If you want to test S3 upload locally, uncomment the sessionToken line
      // credentials: {
      //   accessKeyId: GLOBAL_CONFIG.app.awsAccessKey,
      //   secretAccessKey: GLOBAL_CONFIG.app.awsSecretKey,
      //   sessionToken: GLOBAL_CONFIG.app.awsSessionToken,
      // },
      region: GLOBAL_CONFIG.app.awsRegion,
    });
    this.bucketName = GLOBAL_CONFIG.app.awsBucket;
  }

  async uploadFile(
    file: Express.Multer.File,
    data: AssetUploadDto,
    plan,
    initiative,
  ): Promise<string> {
    let key: string;
    if (data.assetType === AssetFolderType.INITIATIVE) {
      key = `plan-asset/${plan.name}/${data.assetName}/${file.originalname}`;
    } else if (data.assetType === AssetFolderType.PLAN) {
      key = `plan-asset/${plan.name}/${file.originalname}`;
    } else if (data.assetType === AssetFolderType.GOAL) {
      key = `plan-asset/${plan.name}/${initiative.name}/${data.assetName}/${file.originalname}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      const uploadData = await this.s3Client.send(command);

      if (uploadData.$metadata.httpStatusCode === 200) {
        return key;
      }
    } catch (err) {
      this.logger.error('Error uploading file to S3:', err);
      throw new HttpException(
        {
          message: err.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadFile(key: string): Promise<string> {
    const params: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: 'attachment',
    };

    try {
      const command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: +GLOBAL_CONFIG.app.awsLinkExp || 300,
      });
      console.log('Generated signed URL:', signedUrl);
      return signedUrl;
    } catch (error) {
      this.logger.error('Error creating presigned URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  async deleteFile(key: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const deleteCommand = new DeleteObjectCommand(params);
      await this.s3Client.send(deleteCommand);
      return 'File deleted successfully';
    } catch (error) {
      console.log(error);
      throw new Error('Failed to delete file');
    }
  }

  async renameFile(
    oldKey: string,
    data: RenameFileDto,
    plan,
    fileName: string,
  ): Promise<string> {
    let key: string;
    if (data.assetType !== AssetFolderType.PLAN) {
      key = `plan-asset/${plan.name}/${data.assetName}/${fileName}`;
    } else {
      key = `plan-asset/${plan.name}/${fileName}`;
    }

    const copyParams = {
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${oldKey}`,
      Key: key,
    };

    try {
      // Copy the object to the new key
      const copyCommand = new CopyObjectCommand(copyParams);
      await this.s3Client.send(copyCommand);

      // Delete the old object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: oldKey,
      });
      await this.s3Client.send(deleteCommand);

      return key;
    } catch (error) {
      this.logger.error('Error renaming file in S3:', error);
      throw new Error(error.message);
    }
  }

  async uploadExportedFileToS3(file, fileName) {
    try {
      // Read the file content
      const fileContent = fs.readFileSync(file);
      const key = `export/${fileName}`;

      // Upload the file to S3
      const params = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
      });

      await this.s3Client.send(params);

      const url = await this.downloadFile(key);
      return url;
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }

  async uploadExportedBufferFileToS3(file, fileName) {
    try {
      // Read the file content
      const key = `export/${fileName}`;

      // Upload the file to S3
      const params = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
      });

      await this.s3Client.send(params);

      const url = await this.downloadFile(key);
      return url;
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }
}
