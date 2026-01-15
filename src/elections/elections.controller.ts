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
import { ElectionsService } from './elections.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { BulkVoteDto } from './dto/bulk-vote.dto';

@ApiTags('elections')
@ApiBearerAuth()
@Controller('elections')
export class ElectionsController {
  constructor(private readonly electionsService: ElectionsService) {}

  // =================================================================
  // == Member-specific endpoints
  // =================================================================

  @Roles('Member')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('votable')
  getVotableElections(@CurrentUser() user: RequestUser) {
    return this.electionsService.getVotableElections(user.id);
  }

  /*
  @Roles('Member')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/vote')
  vote(
    @Param('id') electionId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateVoteDto,
  ) {
    return this.electionsService.vote(electionId, user.id, dto.candidateId);
  }
  */

  @Roles('Member')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/bulk-vote')
  bulkVote(
    @Param('id') electionId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkVoteDto,
  ) {
    return this.electionsService.bulkVote(electionId, user.id, dto.selections);
  }

  // =================================================================
  // == Admin-specific endpoints
  // =================================================================

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createElectionDto: CreateElectionDto) {
    return this.electionsService.create(createElectionDto);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.electionsService.findAll();
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.electionsService.findOne(id);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/lists')
  createList(@Param('id') id: string, @Body() dto: CreateCandidateListDto) {
    dto.electionId = id;
    return this.electionsService.createCandidateList(dto);
  }

  @Permissions('elections.manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('lists/:listId/candidates')
  addCandidate(
    @Param('listId') listId: string,
    @Body() dto: CreateCandidateDto,
  ) {
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
