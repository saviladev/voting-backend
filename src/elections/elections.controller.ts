import { Body, Controller, Delete, Get, Param, Post, Put, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ElectionsService } from './elections.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateVoteCountDto } from './dto/update-vote-count.dto';
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

  // NEW: Update vote count for a candidate
  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('candidates/:candidateId/vote-count')
  updateVoteCount(
    @Param('candidateId') candidateId: string,
    @Body() dto: UpdateVoteCountDto,
  ) {
    return this.electionsService.updateCandidateVoteCount(candidateId, dto);
  }

  // NEW: Get election results (COMPLETED elections only)
  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.electionsService.getElectionResults(id);
  }

  // NEW: Get results by position
  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/results/by-position')
  getResultsByPosition(@Param('id') id: string) {
    return this.electionsService.getResultsByPosition(id);
  }

  // NEW: Get results by list
  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/results/by-list')
  getResultsByList(@Param('id') id: string) {
    return this.electionsService.getResultsByList(id);
  }
}
