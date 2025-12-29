import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartiesService } from './parties.service';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parties')
export class PartiesController {
  constructor(private partiesService: PartiesService) {}

  @Permissions('parties.manage')
  @Get()
  listParties() {
    return this.partiesService.listParties();
  }

  @Permissions('parties.manage')
  @Post()
  createParty(@Body() dto: CreatePartyDto) {
    return this.partiesService.createParty(dto);
  }

  @Permissions('parties.manage')
  @Put(':id')
  updateParty(@Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partiesService.updateParty(id, dto);
  }

  @Permissions('parties.manage')
  @Delete(':id')
  deleteParty(@Param('id') id: string) {
    return this.partiesService.deleteParty(id);
  }
}
