import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionRuleScope, CommissionStatus, ConversionStatus, PayoutStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CommissionQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CommissionStatus }) @IsOptional() @IsEnum(CommissionStatus) status?: CommissionStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creatorId?: string;
}

export class ConversionQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ConversionStatus }) @IsOptional() @IsEnum(ConversionStatus) status?: ConversionStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creatorId?: string;
}

export class PayoutQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PayoutStatus }) @IsOptional() @IsEnum(PayoutStatus) status?: PayoutStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creatorId?: string;
}

export class CreateRuleDto {
  @IsString() @Length(2, 80) name: string;
  @IsEnum(CommissionRuleScope) scope: CommissionRuleScope;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(1) rate: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() brandId?: string;
  @IsOptional() @IsUUID() creatorId?: string;
}

export class UpdateRuleDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(1) rate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreatePayoutDto {
  @IsUUID() creatorId: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class MarkPayoutPaidDto {
  @IsString() @Length(2, 200) reference: string;
}

export class ImportedConversionDto {
  @IsString() @Length(1, 120) externalId: string;
  @IsOptional() @IsString() attributionRef?: string;
  @IsEnum(ConversionStatus) status: ConversionStatus;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) orderAmount: number;
  @IsString() @Length(3, 3) currency: string;
  @IsOptional() @IsString() merchantReference?: string;
  @IsDateString() occurredAt: string;
}

export class ImportConversionsDto {
  @IsString() @Length(2, 60) provider: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportedConversionDto) conversions: ImportedConversionDto[];
}
