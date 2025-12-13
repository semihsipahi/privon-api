import { Model, SortOrder } from 'mongoose';
import { parseRefineFilters } from './parseFilter.service';
import { Injectable } from '@nestjs/common';

export interface RefineListParams {
  _start?: number;
  _end?: number;
  _sort?: string;
  _order?: 'asc' | 'desc';
  q?: string;
  [key: string]: any;
}

export interface RefineListResponse<T> {
  data: T[];
  total: number;
}

@Injectable()
export class ResourceService<T extends any, C extends any, U extends any> {
  constructor(protected readonly mongoModel: Model<T>) {}

  async create(data: C, session?: any) {
    if (session) {
      const document = new this.mongoModel(data);
      return await document.save({ session });
    }
    return await this.mongoModel.create(data);
  }

  async update(id: string, data: U, session?: any) {
    return await this.mongoModel.findByIdAndUpdate(id, data, { new: true, session });
  }

  async delete(id: string) {
    return await this.mongoModel.findByIdAndDelete(id);
  }

  async findByID(id: string, projection?: any) {
    if (projection) {
      return await this.mongoModel.findById(id, projection);
    }
    return await this.mongoModel.findById(id);
  }

  async findAll(projection?: any) {
    return await this.mongoModel.find({}, projection);
  }

  async findOne(query, projection = {}) {
    return await this.mongoModel.findOne(query, projection);
  }

  /**
   * Refine simple-rest uyumlu liste metodu
   *
   * Query params:
   * - _start: başlangıç index (0-tabanlı)
   * - _end: bitiş index (hariç)
   * - _sort: sıralama alanı (virgülle ayrılmış)
   * - _order: sıralama yönü (asc/desc, virgülle ayrılmış)
   * - q: full-text search
   * - field_like, field_gte, vb: filter operatörleri
   *
   * @param queryParams - URL query parametreleri
   * @param projection - MongoDB projection (hassas alanları hariç tutmak için, örn: { password: 0 })
   * @param populateOptions - İlişkili dataları doldurmak için populate seçenekleri
   *
   * @returns { data: T[], total: number }
   */
  async list(
    queryParams: RefineListParams,
    projection?: any,
    populateOptions?: any[],
  ): Promise<RefineListResponse<T>> {
    // Pagination
    const start = Number(queryParams._start) || 0;
    const end = Number(queryParams._end) || start + 10;
    const limit = end - start;

    // Filters
    const mongoQuery = parseRefineFilters(queryParams);

    // Sorting
    const sortOptions: Record<string, 1 | -1> = {};
    if (queryParams._sort && queryParams._order) {
      const sortFields = queryParams._sort.split(',');
      const sortOrders = queryParams._order.split(',');

      sortFields.forEach((field, index) => {
        const order = sortOrders[index] || sortOrders[0];
        sortOptions[field.trim()] = order === 'asc' ? 1 : -1;
      });
    } else {
      // Default sort: createdAt desc
      sortOptions.createdAt = -1;
    }

    // Query builder
    let queryBuilder = this.mongoModel
      .find(mongoQuery, projection)
      .sort(sortOptions)
      .skip(start)
      .limit(limit);

    // Populate relations
    if (populateOptions && populateOptions.length > 0) {
      for (const populateOption of populateOptions) {
        queryBuilder = queryBuilder.populate(populateOption);
      }
    }

    // Execute queries in parallel
    return {
      data: await queryBuilder.lean().exec() as T[],
      total: await this.mongoModel.countDocuments(mongoQuery).exec(),
    };
  }
}
