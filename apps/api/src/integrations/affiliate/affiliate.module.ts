import { Global, Module } from '@nestjs/common';
import { AFFILIATE_PROVIDERS } from './affiliate-provider';
import { GenericWebhookProvider } from './generic-webhook.provider';
import { AffiliateRegistry } from './affiliate.registry';

@Global()
@Module({
  providers: [
    GenericWebhookProvider,
    { provide: AFFILIATE_PROVIDERS, useFactory: (g: GenericWebhookProvider) => [g], inject: [GenericWebhookProvider] },
    AffiliateRegistry,
  ],
  exports: [AffiliateRegistry],
})
export class AffiliateModule {}
