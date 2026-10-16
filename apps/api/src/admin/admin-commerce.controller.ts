import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../categories/dto/category.dto';
import { CommissionsService } from '../commissions/commissions.service';
import {
  CommissionQueryDto, ConversionQueryDto, CreatePayoutDto, CreateRuleDto, ImportConversionsDto, MarkPayoutPaidDto, PayoutQueryDto, UpdateRuleDto,
} from '../commissions/dto/commission.dto';
import { AdminProductQueryDto, CreateProductDto, ProductLinkInput, UpdateLinkDto, UpdateProductDto } from '../products/dto/product.dto';
import { ProductsService } from '../products/products.service';

@ApiTags('admin') @ApiBearerAuth() @Roles(Role.ADMIN)
@Controller('admin')
export class AdminCatalogController {
  constructor(private products: ProductsService, private categories: CategoriesService) {}

  @Get('products') listProducts(@Query() q: AdminProductQueryDto) { return this.products.adminList(q); }
  @Post('products') createProduct(@Body() dto: CreateProductDto) { return this.products.create(dto); }
  @Patch('products/:id') updateProduct(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) { return this.products.update(id, dto); }
  @Delete('products/:id') disableProduct(@Param('id', ParseUUIDPipe) id: string) { return this.products.disable(id); }

  @Post('products/:id/links') addLink(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProductLinkInput) { return this.products.addLink(id, dto); }
  @Patch('links/:linkId') updateLink(@Param('linkId', ParseUUIDPipe) id: string, @Body() dto: UpdateLinkDto) { return this.products.updateLink(id, dto); }
  @Delete('links/:linkId') removeLink(@Param('linkId', ParseUUIDPipe) id: string) { return this.products.removeLink(id); }

  @Get('categories') listCategories() { return this.categories.list(true); }
  @Post('categories') createCategory(@Body() dto: CreateCategoryDto) { return this.categories.create(dto); }
  @Patch('categories/:id') updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) { return this.categories.update(id, dto); }
  @Delete('categories/:id') removeCategory(@Param('id', ParseUUIDPipe) id: string) { return this.categories.remove(id); }
}

@ApiTags('admin') @ApiBearerAuth() @Roles(Role.ADMIN)
@Controller('admin')
export class AdminCommerceController {
  constructor(private svc: CommissionsService) {}

  @Get('conversions') conversions(@Query() q: ConversionQueryDto) { return this.svc.listConversions(q); }

  /** Verified import of conversions from an affiliate network report. Recorded as evidence with the given provider name. */
  @Post('conversions/import') @HttpCode(200)
  async import(@Body() dto: ImportConversionsDto) {
    for (const c of dto.conversions) {
      await this.svc.recordConversion({
        provider: dto.provider, externalId: c.externalId, attributionRef: c.attributionRef, status: c.status, orderAmount: c.orderAmount,
        currency: c.currency.toUpperCase(), merchantReference: c.merchantReference, occurredAt: new Date(c.occurredAt), raw: { source: 'admin-import', ...c },
      });
    }
    return { processed: dto.conversions.length };
  }

  @Get('commissions') commissions(@Query() q: CommissionQueryDto) { return this.svc.listCommissions(q); }
  @Post('commissions/:id/approve') @HttpCode(200) approve(@Param('id', ParseUUIDPipe) id: string) { return this.svc.approveCommission(id); }
  @Post('commissions/:id/void') @HttpCode(200) voidIt(@Param('id', ParseUUIDPipe) id: string) { return this.svc.voidCommission(id); }

  @Get('commission-rules') rules() { return this.svc.listRules(); }
  @Post('commission-rules') createRule(@Body() dto: CreateRuleDto) { return this.svc.createRule(dto); }
  @Patch('commission-rules/:id') updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRuleDto) { return this.svc.updateRule(id, dto); }

  @Get('payouts') payouts(@Query() q: PayoutQueryDto) { return this.svc.listPayouts(q); }
  @Post('payouts') createPayout(@CurrentUser() u: AuthUser, @Body() dto: CreatePayoutDto) { return this.svc.createPayout(u.id, dto); }
  @Post('payouts/:id/mark-paid') @HttpCode(200)
  markPaid(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkPayoutPaidDto) { return this.svc.markPayoutPaid(u.id, id, dto.reference); }
  @Post('payouts/:id/cancel') @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.cancelPayout(u.id, id); }
}
