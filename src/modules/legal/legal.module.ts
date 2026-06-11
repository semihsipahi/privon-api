import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import {
  LegalDocument,
  LegalDocumentSchema,
} from '../../models/legal-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LegalDocument.name, schema: LegalDocumentSchema },
    ]),
  ],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService, MongooseModule],
})
export class LegalModule {}
