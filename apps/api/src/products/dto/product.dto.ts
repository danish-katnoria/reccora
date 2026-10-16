import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, IsUrl, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { LinkStatus, ProductStatus } from '@prisma/client';
import { SearchPaginationDto } from '../../common/dto/pagination.dto';

export class ProductQueryDto extends SearchPaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string; // slug
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @ApiPropertyOptional({ enum: ['newest', 'price_asc', 'price_desc', 'popular'] })
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'popular']) sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
}

export class ProductImageInput {
  @ApiProperty() @IsUrl({ require_tld: false }) url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) alt?: string;
}

export class ProductLinkInput {
  @ApiProperty() @IsString() @MaxLength(100) merchantName: string;
  @ApiProperty() @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }) url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() affiliateProvider?: string;
  @ApiPropertyOptional({ enum: LinkStatus }) @IsOptional() @IsEnum(LinkStatus) status?: LinkStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @Length(2, 160) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price: number;
  @ApiPropertyOptional({ default: 'USD' }) @IsOptional() @Transform(({ value }) => String(value).toUpperCase()) @IsString() @Length(3, 3) currency?: string;
  @ApiProperty() @IsString() @MaxLength(100) merchantName: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: ProductStatus }) @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @ApiPropertyOptional({ type: [ProductImageInput] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageInput) images?: ProductImageInput[];
  @ApiPropertyOptional({ type: [ProductLinkInput] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductLinkInput) links?: ProductLinkInput[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() @Length(2, 160) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price?: number;
  @IsOptional() @Transform(({ value }) => String(value).toUpperCase()) @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() @MaxLength(100) merchantName?: string;
  @IsOptional() @IsUUID() brandId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageInput) images?: ProductImageInput[];
}

export class UpdateLinkDto {
  @IsOptional() @IsString() @MaxLength(100) merchantName?: string;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }) url?: string;
  @IsOptional() @IsString() affiliateProvider?: string;
  @IsOptional() @IsEnum(LinkStatus) status?: LinkStatus;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class AdminProductQueryDto extends ProductQueryDto {
  @ApiPropertyOptional({ enum: ProductStatus }) @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

