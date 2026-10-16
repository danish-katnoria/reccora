import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RegisterDto {
  @ApiProperty() @Transform(trimLower) @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) password: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60) displayName: string;
  @ApiPropertyOptional({ enum: ['SHOPPER', 'CREATOR'] }) @IsOptional() @IsIn(['SHOPPER', 'CREATOR']) role?: 'SHOPPER' | 'CREATOR';
  @ApiPropertyOptional({ description: 'Creator handle (letters, numbers, underscore)' })
  @IsOptional() @Transform(trimLower) @Matches(/^[a-z0-9_]{3,30}$/, { message: 'handle must be 3-30 chars: a-z, 0-9, _' })
  handle?: string;
}

export class LoginDto {
  @ApiProperty() @Transform(trimLower) @IsEmail() email: string;
  @ApiProperty() @IsString() @MaxLength(72) password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty() @IsString() token: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @Transform(trimLower) @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) password: string;
}
