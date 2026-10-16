import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorStatus, PostStatus, ReportStatus, ReportTargetType, Role, UserStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, IsUrl, Length, MaxLength } from 'class-validator';
import { SearchPaginationDto } from '../../common/dto/pagination.dto';

export class AdminUserQueryDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
export class AdminCreatorQueryDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: CreatorStatus }) @IsOptional() @IsEnum(CreatorStatus) status?: CreatorStatus;
}
export class AdminPostQueryDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: PostStatus }) @IsOptional() @IsEnum(PostStatus) status?: PostStatus;
}
export class AdminReportQueryDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: ReportStatus }) @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
}
export class SetUserStatusDto {
  @IsEnum(UserStatus) status: UserStatus;
}
export class SetCreatorStatusDto {
  @IsEnum(CreatorStatus) status: CreatorStatus;
}
export class CreateBrandDto {
  @IsString() @Length(2, 100) name: string;
  @IsOptional() @IsUrl({ require_tld: false }) websiteUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) logoUrl?: string;
}
export class UpdateBrandDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsUrl({ require_tld: false }) websiteUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) logoUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class CreateReportDto {
  @IsEnum(ReportTargetType) targetType: ReportTargetType;
  @IsUUID() targetId: string;
  @IsString() @Length(3, 120) reason: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
export class ResolveReportDto {
  @IsEnum(['RESOLVED', 'DISMISSED', 'REVIEWING']) status: 'RESOLVED' | 'DISMISSED' | 'REVIEWING';
  @IsOptional() @IsString() @MaxLength(1000) resolution?: string;
  @IsOptional() @IsBoolean() removeContent?: boolean;
}
