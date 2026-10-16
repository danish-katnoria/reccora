import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FollowsService } from './follows.service';

@ApiTags('follows') @ApiBearerAuth()
@Controller()
export class FollowsController {
  constructor(private svc: FollowsService) {}

  @Post('creators/:handle/follow') @HttpCode(200)
  follow(@CurrentUser() u: AuthUser, @Param('handle') handle: string) {
    return this.svc.follow(u.id, handle);
  }

  @Delete('creators/:handle/follow')
  unfollow(@CurrentUser() u: AuthUser, @Param('handle') handle: string) {
    return this.svc.unfollow(u.id, handle);
  }

  @Get('me/following')
  following(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.svc.listFollowing(u.id, q.page, q.limit);
  }
}
