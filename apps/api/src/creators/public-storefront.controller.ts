import { Controller, Get, Header, Param, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { AppConfig } from '../config/configuration';
import { OptionalAuth } from '../common/decorators';
import { CreatorsService } from './creators.service';
import { renderStorefront } from './storefront-page';

/** Shareable, server-rendered storefront at /c/:handle (outside the /api prefix). Click-through uses the tracking redirect. */
@ApiExcludeController()
@Controller({ path: 'c', version: VERSION_NEUTRAL })
export class PublicStorefrontController {
  private base: string;

  constructor(private creators: CreatorsService, config: ConfigService) {
    this.base = config.get<AppConfig>('app')!.publicWebUrl.replace(/\/$/, '');
  }

  @OptionalAuth() @Get(':handle')
  @Header('Content-Security-Policy', "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'")
  @Header('Cache-Control', 'public, max-age=60')
  async page(@Param('handle') handle: string, @Res() res: Response) {
    const { creator, products } = await this.creators.storefront(handle);
    res.type('html').send(renderStorefront({ creator: { ...creator, followerCount: creator.followerCount ?? 0, storefrontUrl: creator.storefrontUrl }, products }, this.base));
  }
}
