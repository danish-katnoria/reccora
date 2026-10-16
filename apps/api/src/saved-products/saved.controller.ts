import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SavedService } from './saved.service';

@ApiTags('saved') @ApiBearerAuth()
@Controller()
export class SavedController {
  constructor(private svc: SavedService) {}

  @Put('saved/products/:id') @HttpCode(200)
  save(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.saveProduct(u.id, id);
  }

  @Delete('saved/products/:id')
  unsave(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.unsaveProduct(u.id, id);
  }

  @Get('saved/products')
  products(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.svc.listProducts(u.id, q.page, q.limit);
  }

  @Get('saved/recently-viewed')
  recent(@CurrentUser() u: AuthUser) {
    return this.svc.recentlyViewed(u.id, 20);
  }

  @Put('saved/collections/:id') @HttpCode(200)
  saveCollection(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.saveCollection(u.id, id);
  }

  @Delete('saved/collections/:id')
  unsaveCollection(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.unsaveCollection(u.id, id);
  }

  @Get('saved/collections')
  collections(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.svc.listCollections(u.id, q.page, q.limit);
  }
}
