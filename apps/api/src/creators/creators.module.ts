import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { PublicStorefrontController } from './public-storefront.controller';

@Module({ controllers: [CreatorsController, PublicStorefrontController], providers: [CreatorsService], exports: [CreatorsService] })
export class CreatorsModule {}
