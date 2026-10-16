import { Controller, Get, Headers, HttpCode, Ip, NotFoundException, Param, ParseUUIDPipe, Post, Query, RawBodyRequest, Req, Res, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthUser, CurrentUser, Public, Roles } from '../common/decorators';
import { AnalyticsQueryDto, ClickQueryDto } from './dto/tracking.dto';
import { TrackingService } from './tracking.service';

@ApiTags('tracking')
@Controller()
export class TrackingController {
  constructor(private svc: TrackingService) {}

  /** Outbound purchase link: records the click then 302-redirects to the approved merchant URL. */
  @Public() @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('go/:productId')
  async go(@Param('productId', ParseUUIDPipe) productId: string, @Query() q: ClickQueryDto, @Req() req: Request, @Res() res: Response, @Ip() ip: string, @Headers('user-agent') ua?: string) {
    const { redirectUrl } = await this.svc.recordClick(productId, { creatorHandle: q.creator, postId: q.post, source: q.source, userAgent: ua, ip });
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, redirectUrl);
  }

  /** Affiliate-network / trusted-integration callback. Requires a valid provider signature. */
  @Public() @SkipThrottle() @HttpCode(200)
  @Post('affiliate/:provider/callback')
  async callback(@Param('provider') provider: string, @Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    const result = await this.svc.handleProviderCallback(provider, req.rawBody ?? '', req.headers, body);
    // Same response for unknown provider and bad signature to avoid probing.
    if (!result) throw new NotFoundException();
    return result;
  }

  @ApiBearerAuth() @Roles(Role.CREATOR)
  @Get('creators/me/analytics')
  analytics(@CurrentUser() u: AuthUser, @Query() q: AnalyticsQueryDto) {
    return this.svc.creatorAnalytics(u.id, q.days);
  }
}
