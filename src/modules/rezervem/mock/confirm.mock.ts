export function getMockConfirm(holdId: string, guestInfo: object): object {
  return {
    reservationId: `rsv-${Date.now()}`,
    holdId,
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    guestInfo,
    confirmationCode: `PRV${Math.floor(100000 + Math.random() * 900000)}`,
    message: 'Rezervasyonunuz başarıyla oluşturulmuştur.',
  };
}
