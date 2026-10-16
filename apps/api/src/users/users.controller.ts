import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ChangePasswordDto, DeleteAccountDto, UpdateMeDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users') @ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  me(@CurrentUser() u: AuthUser) {
    return this.svc.getMe(u.id);
  }

  @Patch()
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateMeDto) {
    return this.svc.updateMe(u.id, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('password') @HttpCode(200)
  password(@CurrentUser() u: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(u.id, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } }) @Delete()
  remove(@CurrentUser() u: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.svc.deleteMe(u.id, dto);
  }
}
