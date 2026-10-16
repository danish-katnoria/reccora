import { Module } from '@nestjs/common';
import { CollectionsModule } from '../collections/collections.module';
import { CreatorsModule } from '../creators/creators.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({ imports: [CreatorsModule, CollectionsModule], controllers: [FeedController], providers: [FeedService] })
export class FeedModule {}
