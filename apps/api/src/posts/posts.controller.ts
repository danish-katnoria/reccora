import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, OptionalAuth, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts') @ApiBearerAuth()
@Controller('posts')
export class PostsController {
  constructor(private svc: PostsService) {}

  @Roles(Role.CREATOR) @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePostDto) {
    return this.svc.create(u.id, dto);
  }

  @Roles(Role.CREATOR) @Get('mine')
  mine(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.svc.listOwn(u.id, q.page, q.limit);
  }

  @Roles(Role.CREATOR) @Get('mine/:id')
  mineOne(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getOwn(u.id, id);
  }

  @OptionalAuth() @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u?: AuthUser) {
    return this.svc.getPublic(id, u?.id);
  }

  @Roles(Role.CREATOR) @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePostDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Roles(Role.CREATOR) @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(u.id, id);
  }
}
