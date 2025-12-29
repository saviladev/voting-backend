import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Permissions('branches.manage')
  @Get()
  list() {
    return this.branchesService.list();
  }

  @Permissions('branches.manage')
  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Permissions('branches.manage')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Permissions('branches.manage')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.branchesService.softDelete(id);
  }
}
