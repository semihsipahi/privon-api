import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsRequest,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(UploadService.name);

  constructor(private config: ConfigService) {
    this.s3Client = new S3Client({
      endpoint: config.get('MINIO_ENDPOINT') + ':' + config.get('MINIO_PORT'),
      region: config.get('MINIO_REGION'),
      credentials: {
        accessKeyId: config.get('MINIO_ACCESS_KEY'),
        secretAccessKey: config.get('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(file: Express.Multer.File) {
    try {
      const key = Date.now().toString() + file.originalname;
      const params: PutObjectCommandInput = {
        Bucket: this.config.get('MINIO_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await this.s3Client.send(new PutObjectCommand(params));
      return `${this.config.get('MINIO_ENDPOINT')}:${this.config.get('MINIO_PORT')}/${this.config.get('MINIO_BUCKET')}/${key}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new InternalServerErrorException('File upload failed.');
    }
  }

  async deleteFile(urlList: string[]) {
    try {
      const bucketName = this.config.get('MINIO_BUCKET');

      const params: DeleteObjectsRequest = {
        Bucket: bucketName,
        Delete: {
          Objects: urlList.map((url) => {
            const bucketPath = `/${bucketName}/`;
            const bucketIndex = url.indexOf(bucketPath);

            let objectKey: string;
            if (bucketIndex !== -1) {
              objectKey = url.substring(bucketIndex + bucketPath.length);
            } else {
              const urlParts = url.split('/');
              objectKey = urlParts.slice(-2).join('/'); 
            }

            return { Key: decodeURIComponent(objectKey) };
          }),
        },
      };

      return await this.s3Client.send(new DeleteObjectsCommand(params));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new InternalServerErrorException('File deletion failed.');
    }
  }
  async deleteFiles(urlList: string[]): Promise<void> {
    const bucket = this.config.get('MINIO_BUCKET');
    const endpoint = `${this.config.get('MINIO_ENDPOINT')}:${this.config.get('MINIO_PORT')}/${bucket}`;

    const deleteObjects = urlList.map((url) => {
      const key = decodeURI(url)
        .split(endpoint + `${bucket}/`)
        .pop();
      return { Key: key };
    });

    const failedDeletions: { url: string; error: any }[] = [];

    try {
      const deleteParams = {
        Bucket: bucket,
        Delete: { Objects: deleteObjects },
      };

      if (deleteParams.Delete.Objects.length > 0) {
        const response = await this.s3Client.send(
          new DeleteObjectsCommand(deleteParams),
        );

        if (response.Deleted) {
          this.logger.log(
            `✅ Successfully deleted files: ${response.Deleted.map((d) => d.Key).join(', ')}`,
          );
        }

        if (response.Errors) {
          response.Errors.forEach((error) => {
            this.logger.warn(
              `⚠️ Failed to delete file: ${error.Key}, Error: ${error.Message}`,
            );
            failedDeletions.push({ url: error.Key, error: error.Message });
          });
        }
      }
    } catch (batchError) {
      this.logger.warn(
        '⚠️ Error during batch deletion process, switching to single delete:',
        batchError.stack,
      );

      for (const obj of deleteObjects) {
        try {
          const deleteParams = { Bucket: bucket, Key: obj.Key };
          await this.s3Client.send(new DeleteObjectCommand(deleteParams));
          this.logger.log(`✅ Successfully deleted file: ${obj.Key}`);
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to delete file: ${obj.Key}, Error: ${error.message}`,
          );
          failedDeletions.push({ url: obj.Key, error });
        }
      }
    }

    if (failedDeletions.length > 0) {
      this.logger.warn(
        `⚠️ Some files could not be deleted: ${failedDeletions.map((f) => f.url).join(', ')}`,
      );
    }
  }
}