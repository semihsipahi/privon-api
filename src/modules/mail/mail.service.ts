import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { mailerConfig } from 'src/common/config/mail.config';
@Injectable()
export class MailService {
  private transporters: { [key: string]: nodemailer.Transporter } = {};

  constructor() {
    this.initializeTransporters();
  }

  private initializeTransporters() {
    for (const account in mailerConfig) {
      if (mailerConfig.hasOwnProperty(account)) {
        const accountConfig = mailerConfig[account];
        if (!accountConfig.transport || !accountConfig.defaults) {
          throw new Error(`Eksik mail yapılandırması: ${account}`);
        }
        this.transporters[account] = nodemailer.createTransport({
          ...accountConfig.transport,
        });
      }
    }
  }

  async sendEmail(params: {
    from?: string;
    to: string;
    subject: string;
    html: string;
    account: 'info' | 'support' | 'ticket';
  }) {
    const transporter = this.transporters[params.account];
    if (!transporter) {
      throw new Error(`E-posta hesabı bulunamadı: ${params.account}`);
    }

    const mailOptions = {
      from: params.from || mailerConfig[params.account].defaults.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw new Error(
        `E-posta gönderimi sırasında hata oluştu: ${error.message}`,
      );
    }
  }
}
