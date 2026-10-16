import { Inject, Injectable } from '@nestjs/common';
import { AFFILIATE_PROVIDERS, AffiliateProvider } from './affiliate-provider';
import { GenericWebhookProvider } from './generic-webhook.provider';

@Injectable()
export class AffiliateRegistry {
  constructor(@Inject(AFFILIATE_PROVIDERS) private providers: AffiliateProvider[]) {}

  get(name?: string | null): AffiliateProvider | undefined {
    return name ? this.providers.find((p) => p.name === name) : undefined;
  }

  /** True when at least one provider is able to receive verified conversions. */
  get conversionTrackingConfigured(): boolean {
    return this.providers.some((p) => !(p instanceof GenericWebhookProvider) || p.enabled);
  }
}
