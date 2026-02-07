import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReferralCode } from '../../models/referral-code.schema';
import { User } from '../../models/user.schema';
import { CreateReferralCodeDto } from 'src/dtos/create-referral-code.dto';
import { UpdateReferralCodeDto } from 'src/dtos/update-referral-code.dto';
import { ResourceService } from 'src/services/resource.service';
import { ReferralCodeType } from 'src/common/enums/referral-code-type.enum';
import { ReferralCodeStatus } from 'src/common/enums/referral-code-status.enum';
import { CustomException } from 'src/common/exceptions/custom.exception';

@Injectable()
export class ReferralCodeService extends ResourceService<
  ReferralCode,
  CreateReferralCodeDto,
  UpdateReferralCodeDto
> {
  constructor(
    @InjectModel(ReferralCode.name) private referralCodeModel: Model<ReferralCode>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super(referralCodeModel);
  }

  async createCorporateCode(dto: CreateReferralCodeDto, adminUserId: string) {
    const code = dto.code
      ? dto.code.toUpperCase()
      : await this.generateUniqueCode();

    const existing = await this.referralCodeModel.findOne({ code });
    if (existing) {
      throw new CustomException('Bu kod zaten kullanılıyor.', 400);
    }

    return await this.referralCodeModel.create({
      code,
      type: ReferralCodeType.Corporate,
      status: ReferralCodeStatus.Active,
      assignedTo: dto.assignedTo,
      description: dto.description,
      quota: dto.quota,
      createdBy: adminUserId,
    });
  }

  async validateCode(codeString: string): Promise<{
    referralCode: ReferralCode;
    referrerUserId: string | null;
  }> {
    const referralCode = await this.referralCodeModel.findOne({
      code: codeString.toUpperCase(),
    });

    if (!referralCode) {
      throw new CustomException('Geçersiz davet kodu.', 400);
    }

    if (referralCode.status !== ReferralCodeStatus.Active) {
      throw new CustomException('Bu davet kodu artık aktif değil.', 400);
    }

    if (referralCode.usedCount >= referralCode.quota) {
      throw new CustomException('Bu davet kodunun kullanım hakkı dolmuş.', 400);
    }

    const referrerUserId =
      referralCode.type === ReferralCodeType.User
        ? referralCode.createdBy.toString()
        : null;

    return { referralCode, referrerUserId };
  }

  async markCodeUsed(codeId: string, userId: string): Promise<void> {
    const result = await this.referralCodeModel.findOneAndUpdate(
      {
        _id: codeId,
        $expr: { $lt: ['$usedCount', '$quota'] },
      },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: userId },
      },
      { new: true },
    );

    if (!result) {
      throw new CustomException('Davet kodu kullanılamadı (kota dolu).', 400);
    }

    if (result.usedCount >= result.quota) {
      await this.referralCodeModel.findByIdAndUpdate(codeId, {
        status: ReferralCodeStatus.Inactive,
      });
    }
  }

  async generateUserReferralCode(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 404);
    }

    const completed = user.completedReservationCount;
    const maxAllowed = this.getMaxAllowedCodes(completed);

    if (maxAllowed === 0) {
      throw new CustomException(
        'Davet kodu oluşturabilmek için en az 1 rezervasyonu tamamlamış olmalısınız.',
        400,
      );
    }

    const existingCount = await this.referralCodeModel.countDocuments({
      type: ReferralCodeType.User,
      createdBy: userId,
    });

    if (existingCount >= maxAllowed) {
      const nextThreshold = this.getNextThreshold(completed);
      const remaining = nextThreshold - completed;

      const message = nextThreshold === null
        ? 'Maksimum davet kodu hakkınıza ulaştınız.'
        : `Yeni bir davet kodu hakkı kazanmak için ${remaining} rezervasyon daha tamamlamalısınız.`;

      throw new CustomException(message, 400);
    }

    const code = await this.generateUniqueCode();

    return await this.referralCodeModel.create({
      code,
      type: ReferralCodeType.User,
      status: ReferralCodeStatus.Active,
      quota: 1,
      createdBy: userId,
    });
  }

  async getUserReferralCodes(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 404);
    }

    const maxCodes = this.getMaxAllowedCodes(user.completedReservationCount);

    const codes = await this.referralCodeModel
      .find({ type: ReferralCodeType.User, createdBy: userId })
      .populate('usedBy', 'fullName maskedName')
      .sort({ createdAt: -1 })
      .lean();

    return {
      codes,
      maxCodes,
      currentCount: codes.length,
      canGenerate: codes.length < maxCodes,
      completedReservationCount: user.completedReservationCount,
    };
  }

  async getMyReferralTree(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('fullName maskedName referredBy')
      .populate('referredBy', 'fullName maskedName')
      .lean();

    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 404);
    }

    const myReferrals = await this.buildUserTree(userId, 0, 10);

    let totalInvited = 0;
    const countTree = (nodes: any[]) => {
      for (const node of nodes) {
        totalInvited++;
        if (node.referrals?.length) {
          countTree(node.referrals);
        }
      }
    };
    countTree(myReferrals);

    return {
      referredBy: user.referredBy || null,
      myReferrals,
      totalInvited,
    };
  }

  async getUserReferralNetwork(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('fullName phoneNumber status referredBy registeredWithCode')
      .populate('referredBy', 'fullName phoneNumber status')
      .populate({
        path: 'registeredWithCode',
        select: 'code type assignedTo',
        populate: { path: 'createdBy', select: 'fullName phoneNumber' },
      })
      .lean();

    if (!user) {
      throw new CustomException('Kullanıcı bulunamadı.', 404);
    }

    const downTree = await this.buildAdminTree(userId, 0, 10);

    let totalNetworkSize = 0;
    const countAdminTree = (nodes: any[]) => {
      for (const node of nodes) {
        totalNetworkSize++;
        if (node.children?.length) {
          countAdminTree(node.children);
        }
      }
    };
    countAdminTree(downTree);

    return {
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        status: user.status,
      },
      referredBy: user.referredBy || null,
      registeredWithCode: user.registeredWithCode || null,
      downTree,
      totalNetworkSize,
    };
  }

  async getCodeUsageStats(codeId: string) {
    const code = await this.referralCodeModel
      .findById(codeId)
      .populate('createdBy', 'fullName phoneNumber')
      .populate('usedBy', 'fullName phoneNumber status createdAt')
      .lean();

    if (!code) {
      throw new CustomException('Davet kodu bulunamadı.', 404);
    }

    return code;
  }

  private getMaxAllowedCodes(completedCount: number): number {
    if (completedCount >= 10) return 3;
    if (completedCount >= 3) return 2;
    if (completedCount >= 1) return 1;
    return 0;
  }

  private getNextThreshold(completedCount: number): number | null {
    if (completedCount < 1) return 1;
    if (completedCount < 3) return 3;
    if (completedCount < 10) return 10;
    return null;
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.referralCodeModel.findOne({ code });
      if (!existing) return code;
    }
    throw new CustomException('Kod oluşturulamadı, lütfen tekrar deneyin.', 500);
  }

  private async buildUserTree(userId: string, depth: number, maxDepth: number): Promise<any[]> {
    if (depth >= maxDepth) return [];

    const referredUsers = await this.userModel
      .find({ referredBy: userId })
      .select('fullName maskedName createdAt')
      .lean();

    const tree = [];
    for (const user of referredUsers) {
      const children = await this.buildUserTree(user._id.toString(), depth + 1, maxDepth);
      tree.push({
        id: user._id,
        fullName: user.fullName,
        maskedName: user.maskedName,
        registeredAt: (user as any).createdAt,
        referrals: children,
      });
    }

    return tree;
  }

  private async buildAdminTree(userId: string, depth: number, maxDepth: number): Promise<any[]> {
    if (depth >= maxDepth) return [];

    const referredUsers = await this.userModel
      .find({ referredBy: userId })
      .select('fullName phoneNumber status createdAt')
      .lean();

    const tree = [];
    for (const user of referredUsers) {
      const children = await this.buildAdminTree(user._id.toString(), depth + 1, maxDepth);
      tree.push({
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        status: user.status,
        registeredAt: (user as any).createdAt,
        children,
      });
    }

    return tree;
  }
}
