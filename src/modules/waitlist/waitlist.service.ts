import { Injectable } from '@nestjs/common';
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
    constructor(
        @InjectModel(Waitlist.name)
        private waitlistModel: Model<Waitlist>,
        private readonly mailService: MailService,
    ) {
        super(waitlistModel);
    }

    async createWaitlist(dto: CreateWaitlistDto): Promise<Waitlist> {
        // Kaydı oluştur
        const waitlistEntry = await this.waitlistModel.create(dto);

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
        // Alıcı olarak kendisini (info) kullanıyoruz
        // Konfigrasyonda info hesabının varsayılan göndereni 'yazilim@wcanx.co' görünüyor.
        try {
            await this.mailService.sendEmail({
                account: 'info',
                to: 'yazilim@wcanx.co', // Kendisine gönderiyor
                subject: 'Yeni Waitlist Başvurusu',
                html: emailHtml,
            });
        } catch (error) {
            console.error('Waitlist email gönderilemedi:', error);
            // Email hatası kaydı engellememeli, o yüzden throw etmiyoruz
        }

        return waitlistEntry;
    }
}
