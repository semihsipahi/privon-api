import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsRequest,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(UploadService.name);
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    const minioEndpoint = config.get('MINIO_ENDPOINT');
    const minioPort = config.get('MINIO_PORT');

    // Add http:// if no protocol specified (for internal Docker network)
    const hasProtocol =
      minioEndpoint?.startsWith('http://') ||
      minioEndpoint?.startsWith('https://');
    const baseEndpoint = hasProtocol
      ? minioEndpoint
      : `http://${minioEndpoint}`;

    this.endpoint = minioPort ? `${baseEndpoint}:${minioPort}` : baseEndpoint;
    this.bucketName = config.get('MINIO_BUCKET');

    this.publicUrl = config.get('MINIO_PUBLIC_URL') || this.endpoint;

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: config.get('MINIO_REGION'),
      credentials: {
        accessKeyId: config.get('MINIO_ACCESS_KEY'),
        secretAccessKey: config.get('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true,
      requestHandler: {
        requestTimeout: 5000, // 5 second timeout
        connectionTimeout: 5000,
      } as any,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureBucketExists();
    } catch (error) {
      this.logger.warn(
        `⚠️ Could not connect to MinIO at startup: ${error.message}. Will retry on first upload.`,
      );
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`✅ Bucket "${this.bucketName}" already exists.`);
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        this.logger.log(
          `🪣 Bucket "${this.bucketName}" not found. Creating...`,
        );
        await this.createBucket();
      } else {
        this.logger.error(`❌ Error checking bucket: ${error.message}`);
        throw error;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      // Create the bucket
      await this.s3Client.send(
        new CreateBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`✅ Bucket "${this.bucketName}" created successfully.`);

      // Set public read policy for GET requests
      await this.setBucketPublicReadPolicy();
    } catch (error) {
      this.logger.error(`❌ Error creating bucket: ${error.message}`);
      throw new InternalServerErrorException('Failed to create bucket.');
    }
  }

  private async setBucketPublicReadPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    try {
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(
        `✅ Public read policy set for bucket "${this.bucketName}".`,
      );
    } catch (error) {
      this.logger.error(`❌ Error setting bucket policy: ${error.message}`);
      throw new InternalServerErrorException('Failed to set bucket policy.');
    }
  }

  async uploadFile(file: Express.Multer.File) {
    try {
      const key = Date.now().toString() + file.originalname;
      const params: PutObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await this.s3Client.send(new PutObjectCommand(params));
      return `${this.publicUrl}/${this.bucketName}/${key}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new InternalServerErrorException('File upload failed.');
    }
  }

  getInternalUrl(path: string): string {
    return `${this.endpoint}/${path}`;
  }

  async deleteFile(urlList: string[]) {
    try {
      const params: DeleteObjectsRequest = {
        Bucket: this.bucketName,
        Delete: {
          Objects: urlList.map((url) => {
            const bucketPath = `/${this.bucketName}/`;
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
    const deleteObjects = urlList.map((url) => {
      const key = decodeURI(url)
        .split(`${this.endpoint}/${this.bucketName}/`)
        .pop();
      return { Key: key };
    });

    const failedDeletions: { url: string; error: any }[] = [];

    try {
      const deleteParams = {
        Bucket: this.bucketName,
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
          const deleteParams = { Bucket: this.bucketName, Key: obj.Key };
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
