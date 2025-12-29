import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ElectionsService } from './elections.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('elections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('elections')
export class ElectionsController {
  constructor(private readonly electionsService: ElectionsService) {}

  @Permissions('elections.manage')
  @Post()
  create(@Body() createElectionDto: CreateElectionDto) {
    return this.electionsService.create(createElectionDto);
  }

  @Permissions('elections.manage')
  @Get()
  findAll() {
    return this.electionsService.findAll();
  }

  @Permissions('elections.manage')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.electionsService.findOne(id);
  }

  @Permissions('elections.manage')
  @Post(':id/lists')
  createList(@Param('id') id: string, @Body() dto: CreateCandidateListDto) {
    dto.electionId = id;
    return this.electionsService.createCandidateList(dto);
  }

  @Permissions('elections.manage')
  @Post('lists/:listId/candidates')
  addCandidate(@Param('listId') listId: string, @Body() dto: CreateCandidateDto) {
    dto.candidateListId = listId;
    return this.electionsService.addCandidate(dto);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
      return this.electionsService.update(id, dto);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('lists/:listId')
  deleteList(@Param('listId') listId: string) {
    return this.electionsService.deleteList(listId);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('candidates/:candidateId')
  updateCandidate(@Param('candidateId') candidateId: string, @Body() dto: any) {
    return this.electionsService.updateCandidate(candidateId, dto);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('candidates/:candidateId')
  deleteCandidate(@Param('candidateId') candidateId: string) {
    return this.electionsService.deleteCandidate(candidateId);
  }
}
