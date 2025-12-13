import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBody } from '@nestjs/swagger';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UploadService } from './upload.service';

@ApiTags('Dosya Yükleme')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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
  @Roles(Role.SuperAdmin, Role.User)
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    return await this.uploadService.uploadFile(file);
  }

  @ApiBearerAuth()
  @Roles(Role.SuperAdmin, Role.User)
  @Delete(':url')
  async deleteFile(@Param('url') url: string) {
    return await this.uploadService.deleteFile([url]);
  }
}
