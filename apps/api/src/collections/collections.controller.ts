import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, OptionalAuth, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CollectionsService } from './collections.service';
import { AddCollectionProductDto, CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@ApiTags('collections') @ApiBearerAuth()
@Controller('collections')
export class CollectionsController {
  constructor(private svc: CollectionsService) {}

  @OptionalAuth() @Get('popular')
  popular(@Query() q: PaginationDto, @CurrentUser() u?: AuthUser) {
    return this.svc.popular(q.page, q.limit, u?.id);
  }

  @Roles(Role.CREATOR) @Get('mine')
  mine(@CurrentUser() u: AuthUser) {
    return this.svc.listOwn(u.id);
  }

  @Roles(Role.CREATOR) @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCollectionDto) {
    return this.svc.create(u.id, dto);
  }

  @OptionalAuth() @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u?: AuthUser) {
    return this.svc.detail(id, u?.id);
  }

  @Roles(Role.CREATOR) @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto) {
    return this.svc.update(u.id, id, dto);
  }

  @Roles(Role.CREATOR) @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(u.id, id);
  }

  @Roles(Role.CREATOR) @Post(':id/products') @HttpCode(200)
  addProduct(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCollectionProductDto) {
    return this.svc.addProduct(u.id, id, dto.productId);
  }

  @Roles(Role.CREATOR) @Delete(':id/products/:productId')
  removeProduct(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.svc.removeProduct(u.id, id, productId);
  }
}
