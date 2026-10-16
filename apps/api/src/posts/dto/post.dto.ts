import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, PostStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, IsUrl, Length } from 'class-validator';

export class CreatePostDto {
  @ApiProperty() @IsString() @Length(1, 1000) caption: string;
  @ApiProperty({ description: 'URL returned by POST /uploads' }) @IsUrl({ require_tld: false }) mediaUrl: string;
  @ApiPropertyOptional({ enum: MediaType }) @IsOptional() @IsEnum(MediaType) mediaType?: MediaType;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_tld: false }) thumbnailUrl?: string;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @IsUUID('all', { each: true }) productIds: string[];
  @ApiPropertyOptional({ description: 'Also add the products to this collection' }) @IsOptional() @IsUUID() collectionId?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}

export class UpdatePostDto {
  @IsOptional() @IsString() @Length(1, 1000) caption?: string;
  @IsOptional() @IsUrl({ require_tld: false }) mediaUrl?: string;
  @IsOptional() @IsEnum(MediaType) mediaType?: MediaType;
  @IsOptional() @IsUrl({ require_tld: false }) thumbnailUrl?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @IsUUID('all', { each: true }) productIds?: string[];
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: Extract<PostStatus, 'DRAFT' | 'PUBLISHED'>;
}
