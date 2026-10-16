import { Module } from '@nestjs/common';
import { CreatorsModule } from '../creators/creators.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({ imports: [CreatorsModule], controllers: [PostsController], providers: [PostsService], exports: [PostsService] })
export class PostsModule {}
