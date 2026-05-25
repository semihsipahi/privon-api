import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizePhone } from 'src/helpers/phone.helper';
import { Whitelist } from './whitelist.schema';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectModel(Whitelist.name)
    private readonly whitelistModel: Model<Whitelist>,
  ) {}

  async findByPhone(phoneNumber: string): Promise<Whitelist | null> {
    const normalized = normalizePhone(phoneNumber);
    return this.whitelistModel.findOne({
      $or: [
        { phoneNumber: normalized },
        { phoneNumber: `+90${normalized}` },
        { phoneNumber: `90${normalized}` },
        { phoneNumber: `0${normalized}` },
      ],
    });
  }
}
