import { Module } from '@nestjs/common';
import { CreatorsModule } from '../creators/creators.module';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({ imports: [CreatorsModule], controllers: [CollectionsController], providers: [CollectionsService], exports: [CollectionsService] })
export class CollectionsModule {}
