import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../common/dto/pagination.dto';

export class FeedQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category slug' }) @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: ['all', 'following'] }) @IsOptional() @IsIn(['all', 'following']) scope?: 'all' | 'following';
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}

export class SearchQueryDto {
  @ApiPropertyOptional() @IsString() @MinLength(1) @MaxLength(100) q: string;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) limit: number = 10;
}
