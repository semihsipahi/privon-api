import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LegalDocument,
  LegalDocType,
} from '../../models/legal-document.schema';

@Injectable()
export class LegalService {
  constructor(
    @InjectModel(LegalDocument.name)
    private legalDocumentModel: Model<LegalDocument>,
  ) {}

  async findAll(): Promise<LegalDocument[]> {
    return this.legalDocumentModel.find().sort({ type: 1, version: -1 }).exec();
  }

  async findActiveByType(type: LegalDocType): Promise<LegalDocument> {
    const doc = await this.legalDocumentModel
      .findOne({ type, isActive: true })
      .sort({ version: -1 })
      .exec();
    if (!doc) {
      throw new NotFoundException(`${type} tipinde aktif belge bulunamadı`);
    }
    return doc;
  }

  async findByTypeAndVersion(
    type: LegalDocType,
    version: number,
  ): Promise<LegalDocument> {
    const doc = await this.legalDocumentModel.findOne({ type, version }).exec();
    if (!doc) {
      throw new NotFoundException(
        `${type} tipinde ${version}. versiyon bulunamadı`,
      );
    }
    return doc;
  }

  async findVersionsByType(type: LegalDocType): Promise<LegalDocument[]> {
    return this.legalDocumentModel.find({ type }).sort({ version: -1 }).exec();
  }

  async create(data: Partial<LegalDocument>): Promise<LegalDocument> {
    const lastVersion = await this.legalDocumentModel
      .findOne({ type: data.type })
      .sort({ version: -1 })
      .exec();
    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    const doc = new this.legalDocumentModel({
      ...data,
      version: nextVersion,
    });
    return doc.save();
  }

  async deactivatePreviousVersions(type: LegalDocType): Promise<void> {
    await this.legalDocumentModel
      .updateMany({ type, isActive: true }, { $set: { isActive: false } })
      .exec();
  }

  async update(
    id: string,
    data: Partial<LegalDocument>,
  ): Promise<LegalDocument> {
    const doc = await this.legalDocumentModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!doc) {
      throw new NotFoundException('Belge bulunamadı');
    }
    return doc;
  }

  async remove(id: string): Promise<void> {
    const result = await this.legalDocumentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Belge bulunamadı');
    }
  }
}
