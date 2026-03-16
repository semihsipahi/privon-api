import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mailConfig from 'src/common/config/mail.config';

@Injectable()
export class MailService {
  private transporters: { [key: string]: nodemailer.Transporter } = {};

  constructor(
    @Inject(mailConfig.KEY)
    private mailConfiguration: ConfigType<typeof mailConfig>,
  ) {
    this.initializeTransporters();
  }

  private initializeTransporters() {
    for (const account in this.mailConfiguration) {
      if (this.mailConfiguration.hasOwnProperty(account)) {
        const accountConfig = this.mailConfiguration[account];
        if (!accountConfig.transport || !accountConfig.defaults) {
          continue;
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
      from: params.from || this.mailConfiguration[params.account].defaults.from,
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
