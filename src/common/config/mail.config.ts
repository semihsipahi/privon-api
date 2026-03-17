import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  info: {
    transport: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER || 'info@privon.co',
        pass: process.env.MAIL_PASS,
      },
    },
    defaults: {
      from: '"Privon" <info@privon.co>',
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
