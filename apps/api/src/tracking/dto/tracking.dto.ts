import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ClickQueryDto {
  @IsOptional() @IsString() @MaxLength(30) creator?: string;
  @IsOptional() @IsUUID() post?: string;
  @IsOptional() @IsString() @MaxLength(30) source?: string;
}

export class AnalyticsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  days: number = 30;
}
