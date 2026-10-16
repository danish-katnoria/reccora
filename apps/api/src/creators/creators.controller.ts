import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, OptionalAuth, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateCreatorDto } from './dto/creator.dto';
import { CreatorsService } from './creators.service';

@ApiTags('creators') @ApiBearerAuth()
@Controller('creators')
export class CreatorsController {
  constructor(private svc: CreatorsService) {}

  @OptionalAuth() @Get('trending')
  trending(@Query() q: PaginationDto, @CurrentUser() u?: AuthUser) {
    return this.svc.trending(q.page, q.limit, u?.id);
  }

  // NOTE: 'me' routes are declared before ':handle' so they are not shadowed.
  @Roles(Role.CREATOR) @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.svc.getOwn(u.id);
  }

  @Roles(Role.CREATOR) @Patch('me')
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateCreatorDto) {
    return this.svc.updateOwn(u.id, dto);
  }

  @Roles(Role.CREATOR) @Put('me/storefront/products/:productId')
  addProduct(@CurrentUser() u: AuthUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.svc.addStorefrontProduct(u.id, productId);
  }

  @Roles(Role.CREATOR) @Delete('me/storefront/products/:productId')
  removeProduct(@CurrentUser() u: AuthUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.svc.removeStorefrontProduct(u.id, productId);
  }

  @OptionalAuth() @Get(':handle')
  profile(@Param('handle') handle: string, @CurrentUser() u?: AuthUser) {
    return this.svc.getProfile(handle, u?.id);
  }

  @OptionalAuth() @Get(':handle/storefront')
  storefront(@Param('handle') handle: string, @CurrentUser() u?: AuthUser) {
    return this.svc.storefront(handle, u?.id);
  }
}
