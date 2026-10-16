import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, OptionalAuth } from '../common/decorators';
import { FeedQueryDto, SearchQueryDto } from './feed.dto';
import { FeedService } from './feed.service';

@ApiTags('feed') @ApiBearerAuth()
@Controller()
export class FeedController {
  constructor(private svc: FeedService) {}

  @OptionalAuth() @Get('feed')
  feed(@Query() q: FeedQueryDto, @CurrentUser() u?: AuthUser) {
    return this.svc.feed(q, u?.id);
  }

  @OptionalAuth() @Get('search')
  search(@Query() q: SearchQueryDto, @CurrentUser() u?: AuthUser) {
    return this.svc.search(q.q, q.limit, u?.id);
  }
}
