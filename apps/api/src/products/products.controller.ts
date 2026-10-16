import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, OptionalAuth } from '../common/decorators';
import { ProductQueryDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('products') @ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @OptionalAuth() @Get()
  list(@Query() q: ProductQueryDto, @CurrentUser() u?: AuthUser) {
    return this.svc.list(q, u?.id);
  }

  @OptionalAuth() @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u?: AuthUser) {
    return this.svc.detail(id, u?.id);
  }
}
