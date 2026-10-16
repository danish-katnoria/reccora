import { IsBoolean, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() @Length(2, 60) displayName?: string;
  @IsOptional() @IsUrl({ require_tld: false }) avatarUrl?: string;
  @IsOptional() @IsBoolean() isProfilePrivate?: boolean;
  @IsOptional() @IsBoolean() showActivity?: boolean;
}

export class DeleteAccountDto {
  @IsString() @MaxLength(72) password: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(72) currentPassword: string;
  @IsString() @Length(8, 72) newPassword: string;
}
