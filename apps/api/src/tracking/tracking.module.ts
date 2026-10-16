import { Module } from '@nestjs/common';
import { CommissionsModule } from '../commissions/commissions.module';
import { CreatorsModule } from '../creators/creators.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({ imports: [CommissionsModule, CreatorsModule], controllers: [TrackingController], providers: [TrackingService], exports: [TrackingService] })
export class TrackingModule {}
