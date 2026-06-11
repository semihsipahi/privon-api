import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

@Injectable()
export class RezervemAuthService {
  private readonly logger = new Logger(RezervemAuthService.name);
  private tokenCache: TokenCache | null = null;
  private inflight: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }
    if (this.inflight) return this.inflight;

    this.inflight = this.fetchNewToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchNewToken(): Promise<string> {
    const baseUrl = this.configService.get<string>('REZERVEM_BASE_URL');
    const clientId = this.configService.get<string>('REZERVEM_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'REZERVEM_CLIENT_SECRET',
    );

    if (!baseUrl || !clientId || !clientSecret) {
      throw new Error(
        'Rezervem credentials missing (REZERVEM_BASE_URL/CLIENT_ID/CLIENT_SECRET)',
      );
    }

    const response = await fetch(`${baseUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        GrantType: 'client_credentials',
        ClientId: clientId,
        ClientSecret: clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `Rezervem token fetch failed: ${response.status} ${text}`,
      );
      throw new Error(`Rezervem auth failed: ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;

    this.tokenCache = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + (data.expiresIn - 60) * 1000,
    };

    this.logger.log(
      `Rezervem access token refreshed (expires in ${data.expiresIn}s)`,
    );
    return this.tokenCache.accessToken;
  }

  clearCache(): void {
    this.tokenCache = null;
  }
}
