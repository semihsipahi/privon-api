import { BadRequestException } from '@nestjs/common';

/**
 * Refine simple-rest query parametrelerini MongoDB query'sine dönüştürür
 *
 * Desteklenen Operatörler:
 * - field=value → { field: value }
 * - field_ne=value → { field: { $ne: value } }
 * - field_lt=value → { field: { $lt: value } }
 * - field_lte=value → { field: { $lte: value } }
 * - field_gt=value → { field: { $gt: value } }
 * - field_gte=value → { field: { $gte: value } }
 * - field_like=value → { field: { $regex: value, $options: 'i' } }
 * - q=value → full-text search (birden fazla alanda arama)
 *
 * @param queryParams - URL query parametreleri
 * @param searchFields - q parametresi için aranacak alanlar (default: ['name', 'email', 'phoneNumber'])
 */
export function parseRefineFilters(
  queryParams: Record<string, any>,
  searchFields: string[] = ['name', 'email', 'phoneNumber'],
): Record<string, any> {
  try {
    const mongoQuery: Record<string, any> = {};

    // Refine operator mapping
    const operatorSuffixes = {
      _ne: '$ne',
      _lt: '$lt',
      _lte: '$lte',
      _gt: '$gt',
      _gte: '$gte',
      _like: '$regex',
    };

    Object.keys(queryParams).forEach((key) => {
      // Pagination, sort ve diğer meta parametreleri atla
      if (['_start', '_end', '_sort', '_order'].includes(key)) {
        return;
      }

      const value = queryParams[key];

      // q parametresi - full text search
      if (key === 'q') {
        mongoQuery.$or = searchFields.map((field) => ({
          [field]: { $regex: value, $options: 'i' },
        }));
        return;
      }

      // Operator suffix kontrolü
      let operatorFound = false;
      for (const [suffix, mongoOp] of Object.entries(operatorSuffixes)) {
        if (key.endsWith(suffix)) {
          const fieldName = key.slice(0, -suffix.length);

          if (mongoOp === '$regex') {
            mongoQuery[fieldName] = { $regex: value, $options: 'i' };
          } else {
            // Sayısal değerleri parse et
            const parsedValue = !isNaN(Number(value)) ? Number(value) : value;
            mongoQuery[fieldName] = { [mongoOp]: parsedValue };
          }

          operatorFound = true;
          break;
        }
      }

      // Eğer operator yoksa, doğrudan eşitlik kontrolü
      if (!operatorFound) {
        const parsedValue = !isNaN(Number(value)) ? Number(value) : value;
        mongoQuery[key] = parsedValue;
      }
    });

    return mongoQuery;
  } catch (error) {
    throw new BadRequestException('Invalid filter format');
  }
}
