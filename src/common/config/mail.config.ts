export const mailerConfig = {
  info: {
    transport: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'yazilim@wcanx.co',
        pass: 'cczw scpi lneh rkco',
      },
    },
    defaults: {
      from: '"İLETİŞİM FORMU" <yazilim@wcanx.co>',
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
};
