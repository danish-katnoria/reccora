import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateCreatorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_tld: false }) avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9_]{3,30}$/, { message: 'handle must be 3-30 chars: a-z, 0-9, _' }) handle?: string;
}
