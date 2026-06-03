import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateWaitlistDto } from 'src/dtos/create-waitlist.dto';
import { ResourceService } from 'src/services/resource.service';
import { Waitlist } from '../../models/waitlist.schema';
import { User } from '../../models/user.schema';
import { MailService } from '../mail/mail.service';
import { normalizePhone } from 'src/helpers/phone.helper';
import { maskName } from 'src/helpers/mask-name.util';
import { Role } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';

@Injectable()
export class WaitlistService extends ResourceService<
  Waitlist,
  CreateWaitlistDto,
  Partial<CreateWaitlistDto>
> {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectModel(Waitlist.name)
    private waitlistModel: Model<Waitlist>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly mailService: MailService,
  ) {
    super(waitlistModel);
  }

  async createWaitlist(dto: CreateWaitlistDto): Promise<Waitlist> {
    dto.phoneNumber = normalizePhone(dto.phoneNumber);
    this.logger.log(`Yeni waitlist başvurusu alınıyor: ${JSON.stringify(dto)}`);

    const existing = await this.waitlistModel.findOne({
      $or: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });
    if (existing) {
      throw new ConflictException('Bu e-posta veya telefon numarası zaten kayıtlı.');
    }

    let waitlistEntry: Waitlist;

    try {
      waitlistEntry = await super.create(dto);
      this.logger.log(
        `Waitlist kaydı başarıyla oluşturuldu: ${waitlistEntry._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Waitlist kaydı oluşturulurken hata: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    // E-posta içeriğini hazırla
    const emailHtml = `
            <h3>Yeni Waitlist Başvurusu</h3>
            <p><strong>İsim Soyisim:</strong> ${dto.firstName} ${dto.lastName}</p>
            <p><strong>E-posta:</strong> ${dto.email}</p>
            <p><strong>Telefon:</strong> ${dto.phoneNumber}</p>
            <p><strong>Şehir:</strong> ${dto.city}</p>
            <p><strong>Hospitality Standards:</strong> ${dto.hospitalityStandards || '-'}</p>
            <p><strong>Private Club Memberships:</strong> ${dto.privateClubMemberships || '-'}</p>
            <p><strong>Frequent Cities:</strong> ${dto.frequentCities || '-'}</p>
            <p><strong>Hospitality Values:</strong> ${dto.hospitalityValues || '-'}</p>
            <p><strong>Introduced By:</strong> ${dto.introducedBy || '-'}</p>
            <p><strong>Terms Accepted:</strong> ${dto.agreedToTerms ? 'Yes' : 'No'}</p>
            <p><strong>Privacy Accepted:</strong> ${dto.agreedToPrivacy ? 'Yes' : 'No'}</p>
            <p><strong>Marketing Consent:</strong> ${dto.consentToCommunications ? 'Yes' : 'No'}</p>
        `;

    // Yöneticiye (info hesabına) e-posta gönder
    try {
      await this.mailService.sendEmail({
        account: 'info',
        to: 'yazilim@wcanx.co',
        subject: 'Yeni Waitlist Başvurusu',
        html: emailHtml,
      });
      this.logger.log('Waitlist bilgilendirme e-postası gönderildi.');
    } catch (error) {
      this.logger.error('Waitlist email gönderilemedi:', error);
      // Email hatası kaydı engellememeli
    }

    return waitlistEntry;
  }

  async findByPhone(phoneNumber: string): Promise<Waitlist | null> {
    const normalized = normalizePhone(phoneNumber);
    return this.waitlistModel.findOne({
      $or: [
        { phoneNumber: normalized },
        { phoneNumber: `+90${normalized}` },
        { phoneNumber: `90${normalized}` },
        { phoneNumber: `0${normalized}` },
      ],
    });
  }

  async sendMail(dto: { email: string }) {
    const { email } = dto;
    const waitlistEntry = await this.waitlistModel.findOne({ email });
    if (!waitlistEntry) {
      throw new Error('Waitlist kaydı bulunamadı');
    }
    const firstName = waitlistEntry.firstName || '';
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="letter-spacing: 0.15em; font-size: 22px; margin-bottom: 8px;">PRIVON</h2>
        <p style="font-size: 15px; line-height: 1.7; color: #444;">
          ${firstName ? `Merhaba ${firstName},` : 'Merhaba,'}<br/><br/>
          PRIVON üyeliğiniz onaylandı. Hesabınız oluşturuldu.
        </p>
        <p style="font-size: 15px; line-height: 1.7; color: #444;">
          Uygulamayı App Store veya Google Play üzerinden indirip kayıtlı telefon numaranızla giriş yapabilirsiniz.
          Doğrulama kodunu aldıktan sonra şifrenizi oluşturun ve keşfetmeye başlayın.
        </p>
        <p style="font-size: 13px; color: #888; margin-top: 32px;">PRIVON — The new standard.</p>
      </div>
    `;
    try {
      await this.mailService.sendEmail({
        account: 'info',
        to: email,
        subject: 'PRIVON — Hesabınız Hazır',
        html: emailHtml,
      });
      this.logger.log('Bilgilendirme e-postası gönderildi.');
    } catch (error) {
      this.logger.error('Waitlist email gönderilemedi:', error);
    }
    return { message: 'E-posta gönderildi' };
  }

  async deleteOne(id: string) {
    const result = await this.waitlistModel.findByIdAndDelete(id);
    if (!result) throw new Error('Başvuru bulunamadı.');
    return { message: 'Başvuru silindi.' };
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'suitable' | 'approved' | 'rejected',
    statusNote?: string,
  ) {
    const update: any = { status };
    if (statusNote !== undefined) update.statusNote = statusNote;
    const entry = await this.waitlistModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!entry) throw new Error('Başvuru bulunamadı.');

    // "Onaylandı" seçildiğinde kullanıcı hesabını otomatik oluştur
    if (status === 'approved') {
      const normalized = normalizePhone(entry.phoneNumber);
      const exists = await this.userModel.findOne({ phoneNumber: normalized });
      if (!exists) {
        const fullName = `${entry.firstName} ${entry.lastName}`.trim();
        const user = new this.userModel({
          firstName: entry.firstName,
          lastName: entry.lastName,
          fullName,
          maskedName: maskName(fullName),
          phoneNumber: normalized,
          email: entry.email,
          birthDate: entry.birthDate,
          role: Role.User,
          status: UserStatus.Active,
          isPhoneVerified: true,
          isAdminCreated: true,
        });
        await user.save();
        this.logger.log(`Waitlist onayı: kullanıcı oluşturuldu → ${normalized}`);
        return { id: entry._id, status: entry.status, userCreated: true };
      } else {
        this.logger.log(`Waitlist onayı: kullanıcı zaten mevcut → ${normalized}`);
        return { id: entry._id, status: entry.status, userCreated: false, message: 'Kullanıcı zaten mevcut.' };
      }
    }

    return { id: entry._id, status: entry.status };
  }
}
