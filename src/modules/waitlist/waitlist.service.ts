import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceService } from 'src/services/resource.service';
import { Waitlist } from '../../models/waitlist.schema';
import { CreateWaitlistDto } from 'src/dtos/create-waitlist.dto';
import { MailService } from '../mail/mail.service';

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
    this.logger.log(`Yeni waitlist başvurusu alınıyor: ${JSON.stringify(dto)}`);
    let waitlistEntry: Waitlist;
    try {
      // Kaydı oluştur (super.create kullanarak ResourceService üzerinden geçiyoruz)
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
            <p><strong>İsim Soyisim:</strong> ${dto.fullName}</p>
            <p><strong>E-posta:</strong> ${dto.email}</p>
            <p><strong>Telefon:</strong> ${dto.phoneNumber}</p>
            <p><strong>Şehir:</strong> ${dto.city}</p>
            <p><strong>Referans Üye:</strong> ${dto.referralMember || '-'}</p>
            <p><strong>Gastronomi Referansı:</strong> ${dto.gastronomyReference || '-'}</p>
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
