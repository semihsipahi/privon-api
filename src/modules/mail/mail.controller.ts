import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}
  @Post('send')
  async sendMail(
    @Body()
    body: {
      to: string;
      subject: string;
      html: string;
      accountName: 'info' | 'support' | 'ticket';
    },
  ) {
    return await this.mailService.sendEmail({
      from: undefined,
      to: body.to,
      subject: body.subject,
      html: body.html,
      account: body.accountName,
    });
  }
}
