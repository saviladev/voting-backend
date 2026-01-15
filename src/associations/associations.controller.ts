import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AssociationsService } from './associations.service';
import { CreateAssociationDto } from './dto/create-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';

@ApiTags('associations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('associations')
export class AssociationsController {
  constructor(private associationsService: AssociationsService) {}

  @Permissions('associations.manage')
  @Get()
  list() {
    return this.associationsService.list();
  }

  @Permissions('associations.manage')
  @Post()
  create(@Body() dto: CreateAssociationDto) {
    return this.associationsService.create(dto);
  }

  @Permissions('associations.manage')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssociationDto) {
    return this.associationsService.update(id, dto);
  }

  @Permissions('associations.manage')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.associationsService.softDelete(id);
  }
}
