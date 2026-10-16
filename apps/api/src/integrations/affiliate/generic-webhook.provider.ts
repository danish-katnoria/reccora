import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConversionStatus } from '@prisma/client';
import { AppConfig } from '../../config/configuration';
import { AffiliateProvider, ConversionEvent } from './affiliate-provider';

/**
 * Generic HMAC-signed webhook provider. Intended as the reference implementation and for verified
 * server-to-server postbacks. Disabled until AFFILIATE_WEBHOOK_SECRET is configured.
 *
 * Expected header: x-reccora-signature = hex(HMAC_SHA256(secret, rawBody))
 * Expected body: { events: [{ id, ref, status, amount, currency, orderId?, occurredAt }] }
 */
@Injectable()
export class GenericWebhookProvider implements AffiliateProvider {
  readonly name = 'generic';
  private secret?: string;

  constructor(config: ConfigService) {
    this.secret = config.get<AppConfig>('app')!.affiliate.webhookSecret;
  }

  get enabled() {
    return !!this.secret;
  }

  verifyCallback(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): boolean {
    if (!this.secret) return false;
    const sig = headers['x-reccora-signature'];
    if (typeof sig !== 'string') return false;
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseCallback(body: any): ConversionEvent[] {
    const events: any[] = Array.isArray(body?.events) ? body.events : [];
    return events.map((e) => ({
      provider: this.name,
      externalId: String(e.id),
      attributionRef: e.ref ? String(e.ref) : undefined,
      status: this.mapStatus(e.status),
      orderAmount: Number(e.amount),
      currency: String(e.currency ?? 'USD').toUpperCase(),
      merchantReference: e.orderId ? String(e.orderId) : undefined,
      occurredAt: new Date(e.occurredAt),
      raw: e,
    }));
  }

  decorateUrl(url: string, attributionRef: string): string {
    const u = new URL(url);
    u.searchParams.set('subid', attributionRef);
    return u.toString();
  }

  private mapStatus(s: string): ConversionStatus {
    switch ((s ?? '').toLowerCase()) {
      case 'confirmed': return ConversionStatus.CONFIRMED;
      case 'reversed': return ConversionStatus.REVERSED;
      case 'rejected': return ConversionStatus.REJECTED;
      default: return ConversionStatus.PENDING;
    }
  }
}
