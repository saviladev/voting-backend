import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { SpecialtiesService } from './specialties.service';

@ApiTags('specialties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('specialties')
export class SpecialtiesController {
  constructor(private specialtiesService: SpecialtiesService) {}

  @Permissions('specialties.manage')
  @Get()
  list() {
    return this.specialtiesService.list();
  }

  @Permissions('specialties.manage')
  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto);
  }

  @Permissions('specialties.manage')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, dto);
  }

  @Permissions('specialties.manage')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.specialtiesService.softDelete(id);
  }
}
