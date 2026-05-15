import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class RezervemAuthService {
  private readonly logger = new Logger(RezervemAuthService.name);
  private tokenCache: TokenCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }

    return this.fetchNewToken();
  }

  private async fetchNewToken(): Promise<string> {
    const baseUrl = this.configService.get<string>('REZERVEM_BASE_URL');
    const clientId = this.configService.get<string>('REZERVEM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('REZERVEM_CLIENT_SECRET');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Rezervem token fetch failed: ${response.status} ${text}`);
      throw new Error(`Rezervem auth failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    // Cache with 60s buffer before actual expiry
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    this.logger.log('Rezervem access token refreshed');
    return this.tokenCache.accessToken;
  }

  clearCache(): void {
    this.tokenCache = null;
  }
}
