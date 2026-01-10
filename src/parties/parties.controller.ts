import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'scope', required: false, description: 'Filter by scope (NATIONAL, ASSOCIATION, BRANCH, CHAPTER)' })
  @ApiQuery({ name: 'associationId', required: false, description: 'Filter by association ID' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter by branch ID' })
  @ApiQuery({ name: 'chapterId', required: false, description: 'Filter by chapter ID' })
  listParties(
    @Query('scope') scope?: string,
    @Query('associationId') associationId?: string,
    @Query('branchId') branchId?: string,
    @Query('chapterId') chapterId?: string,
  ) {
    return this.partiesService.listParties({ scope, associationId, branchId, chapterId });
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
