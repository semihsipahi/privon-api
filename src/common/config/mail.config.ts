import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  info: {
    transport: {
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 465,
      secure: process.env.MAIL_PORT ? process.env.MAIL_PORT === '465' : true,
      auth: {
        user: process.env.MAIL_USER || 'info@privon.co',
        pass: process.env.MAIL_PASS,
      },
    },
    defaults: {
      from: `"Privon" <${process.env.MAIL_FROM || process.env.MAIL_USER || 'info@privon.co'}>`,
    },
  },
  support: {
    transport: {
      host: 'smtp.yandex.com',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
    defaults: {
      from: '',
    },
  },
  ticket: {
    transport: {
      host: 'smtp.yandex.com',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
    defaults: {
      from: '',
    },
  },
}));
