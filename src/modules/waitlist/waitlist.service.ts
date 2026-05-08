import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateWaitlistDto } from 'src/dtos/create-waitlist.dto';
import { ResourceService } from 'src/services/resource.service';
import { Waitlist } from '../../models/waitlist.schema';
import { MailService } from '../mail/mail.service';
import { normalizePhone } from 'src/helpers/phone.helper';

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

  async sendMail(dto: { email: string; code: string }) {
    const { email, code } = dto;
    const waitlistEntry = await this.waitlistModel.findOne({ email });
    if (!waitlistEntry) {
      throw new Error('Waitlist kaydı bulunamadı');
    }
    const emailHtml = `
            <h3>Waitlist Başvurunuz Onaylandı</h3>
            <p><strong>Davet Kodu:</strong> ${code}</p>
        `;
    try {
      await this.mailService.sendEmail({
        account: 'info',
        to: email,
        subject: 'Waitlist Başvurunuz Onaylandı',
        html: emailHtml,
      });
      this.logger.log('Waitlist bilgilendirme e-postası gönderildi.');
    } catch (error) {
      this.logger.error('Waitlist email gönderilemedi:', error);
      // Email hatası kaydı engellememeli
    }
    return { message: 'E-posta gönderildi' };
  }
}
