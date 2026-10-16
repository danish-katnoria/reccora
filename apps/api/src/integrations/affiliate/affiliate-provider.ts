import { ConversionStatus } from '@prisma/client';

/** Normalised conversion evidence produced by any provider. */
export interface ConversionEvent {
  provider: string;
  externalId: string; // provider's unique order/transaction id (idempotency key)
  attributionRef?: string; // our click reference echoed back by the network
  status: ConversionStatus;
  orderAmount: number;
  currency: string;
  merchantReference?: string;
  occurredAt: Date;
  raw: unknown;
}

/**
 * Integration boundary for affiliate networks. To add a network, implement this interface and register it
 * in AffiliateModule. The platform never creates conversions from clicks; only providers can.
 */
export interface AffiliateProvider {
  readonly name: string;
  /** Verify authenticity of an incoming callback (signature, shared secret, ...). */
  verifyCallback(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): boolean;
  /** Parse a verified callback payload into normalised events. */
  parseCallback(body: any): ConversionEvent[];
  /** Append click attribution to the outbound merchant URL (sub-id parameter). */
  decorateUrl(url: string, attributionRef: string): string;
}

export const AFFILIATE_PROVIDERS = 'AFFILIATE_PROVIDERS';
