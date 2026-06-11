import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Section } from '../../models/section.schema';
import { ResourceService } from 'src/services/resource.service';
import { CreateSectionDto, UpdateSectionDto } from '../../dtos';

@Injectable()
export class SectionService extends ResourceService<
  Section,
  CreateSectionDto,
  UpdateSectionDto
> {
  constructor(
    @InjectModel(Section.name)
    private sectionModel: Model<Section>,
  ) {
    super(sectionModel);
  }

  async list(query: any) {
    if (!query._sort) {
      query._sort = 'order';
      query._order = 'asc';
    }
    return super.list(query, null, ['restaurants']);
  }
}
