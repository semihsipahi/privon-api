import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Apple App Store review için test telefon numaralarını yönetir.
 * Bu numaralara gerçek SMS gönderilmez; OTP her zaman sabit değer döner.
 *
 * .env:
 *   APPLE_TEST_PHONES=5000000001,5000000002
 *   APPLE_TEST_OTP=000000
 */
@Injectable()
export class TestAccountService {
  private readonly testPhones: Set<string>;
  private readonly testOtp: string;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('APPLE_TEST_PHONES') ?? '';
    this.testPhones = new Set(
      raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    );
    this.testOtp = this.configService.get<string>('APPLE_TEST_OTP') ?? '000000';
  }

  /** Normalleştirilmiş (10 haneli) telefon numarasının test hesabı olup olmadığını döner. */
  isTestPhone(normalizedPhone: string): boolean {
    return this.testPhones.has(normalizedPhone);
  }

  /** Test hesapları için kullanılacak sabit OTP kodunu döner. */
  getTestOtp(): string {
    return this.testOtp;
  }
}
