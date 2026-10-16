import { IsBoolean, IsOptional, IsString, IsUUID, IsUrl, Length, MaxLength } from 'class-validator';

export class CreateCollectionDto {
  @IsString() @Length(2, 80) title: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdateCollectionDto {
  @IsOptional() @IsString() @Length(2, 80) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class AddCollectionProductDto {
  @IsUUID() productId: string;
}
