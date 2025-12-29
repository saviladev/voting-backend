import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user?: RequestUser) {
    return this.usersService.getMe(user?.id);
  }

  @Patch('me')
  async updateMe(@Body() dto: UpdateProfileDto, @CurrentUser() user?: RequestUser) {
    return this.usersService.updateProfile(user?.id, dto);
  }
}
