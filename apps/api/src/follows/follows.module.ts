import { Module } from '@nestjs/common';
import { CreatorsModule } from '../creators/creators.module';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({ imports: [CreatorsModule], controllers: [FollowsController], providers: [FollowsService], exports: [FollowsService] })
export class FollowsModule {}
