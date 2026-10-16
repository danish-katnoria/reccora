import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { ProductsModule } from '../products/products.module';
import { AdminController, ReportsController } from './admin.controller';
import { AdminCatalogController, AdminCommerceController } from './admin-commerce.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule, CategoriesModule, CommissionsModule],
  controllers: [AdminController, AdminCatalogController, AdminCommerceController, ReportsController],
  providers: [AdminService],
})
export class AdminModule {}
