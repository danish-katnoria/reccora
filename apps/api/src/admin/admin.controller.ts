import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostStatus, Role } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AdminService } from './admin.service';
import {
  AdminCreatorQueryDto, AdminPostQueryDto, AdminReportQueryDto, AdminUserQueryDto, CreateBrandDto, CreateReportDto, ResolveReportDto,
  SetCreatorStatusDto, SetUserStatusDto, UpdateBrandDto,
} from './dto/admin.dto';

class SetPostStatusDto {
  @IsEnum(PostStatus) status: PostStatus;
}
class ClickQuery extends PaginationDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() creatorId?: string;
}

/** Any signed-in user may file a report. */
@ApiTags('reports') @ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private svc: AdminService) {}

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateReportDto) {
    return this.svc.createReport(u.id, dto);
  }
}

@ApiTags('admin') @ApiBearerAuth() @Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @Get('overview') overview() { return this.svc.overview(); }

  @Get('users') users(@Query() q: AdminUserQueryDto) { return this.svc.listUsers(q); }
  @Patch('users/:id/status')
  setUserStatus(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserStatusDto) { return this.svc.setUserStatus(u.id, id, dto.status); }

  @Get('creators') creators(@Query() q: AdminCreatorQueryDto) { return this.svc.listCreators(q); }
  @Patch('creators/:id/status')
  setCreatorStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetCreatorStatusDto) { return this.svc.setCreatorStatus(id, dto.status); }

  @Get('brands/options') brandOptions() { return this.svc.brandOptions(); }
  @Get('brands') brands(@Query() q: PaginationDto) { return this.svc.listBrands(q); }
  @Post('brands') createBrand(@Body() dto: CreateBrandDto) { return this.svc.createBrand(dto); }
  @Patch('brands/:id') updateBrand(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) { return this.svc.updateBrand(id, dto); }

  @Get('posts') posts(@Query() q: AdminPostQueryDto) { return this.svc.listPosts(q); }
  @Patch('posts/:id/status') setPostStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPostStatusDto) { return this.svc.setPostStatus(id, dto.status); }

  @Get('reports') reports(@Query() q: AdminReportQueryDto) { return this.svc.listReports(q); }
  @Patch('reports/:id')
  resolve(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveReportDto) { return this.svc.resolveReport(u.id, id, dto); }

  @Get('clicks') clicks(@Query() q: ClickQuery) { return this.svc.listClicks(q); }
}
