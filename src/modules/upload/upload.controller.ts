import {
  Controller,
  Delete,
  Param,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UploadService } from './upload.service';
import { FastifyRequest } from 'fastify';

@ApiTags('Dosya Yükleme')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Dosya başarıyla yüklendi.',
    schema: {
      example: {
        message: 'Tek dosya başarıyla yüklendi!',
        filename: 'file-123456789.jpg',
        path: '/uploads/file-123456789.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dosya yükleme hatası.' })
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @Post('single')
  async uploadSingle(@Req() req: FastifyRequest) {
    const data = await req.file();

    if (!data) {
      throw new BadRequestException('Dosya bulunamadı');
    }

    const buffer = await data.toBuffer();

    const file = {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
    };

    return await this.uploadService.uploadFile(file as any);
  }

  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.RestaurantOwner, Role.User)
  @Delete(':url')
  async deleteFile(@Param('url') url: string) {
    return await this.uploadService.deleteFile([url]);
  }
}
