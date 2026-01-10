import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateVoteCountDto } from './dto/update-vote-count.dto';
import {
  ElectionResultsDto,
  CandidateResultDto,
  ListResultDto,
  PositionResultDto,
} from './dto/results.dto';

@Injectable()
export class ElectionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateElectionDto) {
    const { positions, ...data } = dto;
    return this.prisma.election.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        positions: {
          create: positions,
        },
      },
      include: {
        positions: true,
      }
    });
  }

  async findAll() {
    return this.prisma.election.findMany({
      include: {
        positions: true,
        candidateLists: {
            include: {
                politicalParty: true
            }
        },
        association: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
            orderBy: { order: 'asc' }
        },
        candidateLists: {
            include: {
                politicalParty: true,
                candidates: {
                    include: {
                        position: true
                    }
                }
            }
        },
        association: true,
        branch: true,
        chapter: true
      },
    });
    if (!election) throw new NotFoundException('Election not found');
    return election;
  }

  async createCandidateList(dto: CreateCandidateListDto) {
    return this.prisma.candidateList.create({
      data: dto,
    });
  }

  async addCandidate(dto: CreateCandidateDto) {
    const candidateList = await this.prisma.candidateList.findUnique({
        where: { id: dto.candidateListId },
        include: { 
            election: true,
            candidates: true
        }
    });
    if (!candidateList) throw new NotFoundException('Candidate List not found');

    const position = await this.prisma.electionPosition.findUnique({
        where: { id: dto.positionId }
    });
    if (!position) throw new NotFoundException('Position not found');

    if (position.electionId !== candidateList.electionId) {
        throw new Error('Position does not belong to the same election as the candidate list');
    }

    // Check if this position is already filled in this list
    const existingCandidate = candidateList.candidates.find(c => c.positionId === dto.positionId);
    if (existingCandidate) {
        throw new Error('This position already has a candidate in this list');
    }

    return this.prisma.candidate.create({
      data: dto
    });
  }

  async update(id: string, dto: any) {
    const updateData: any = { ...dto };
    
    // Convert date strings to Date objects if present
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    return this.prisma.election.update({
        where: { id },
        data: updateData
    });
  }

  async deleteList(listId: string) {
    // First delete all candidates in this list
    await this.prisma.candidate.deleteMany({
      where: { candidateListId: listId }
    });
    
    // Then delete the list itself
    return this.prisma.candidateList.delete({
      where: { id: listId }
    });
  }

  async updateCandidate(candidateId: string, dto: any) {
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dni: dto.dni,
      }
    });
  }

  async deleteCandidate(candidateId: string) {
    return this.prisma.candidate.delete({
      where: { id: candidateId }
    });
  }

  // NEW: Update vote count for a candidate
  async updateCandidateVoteCount(candidateId: string, dto: UpdateVoteCountDto) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { voteCount: dto.voteCount },
    });
  }

  // NEW: Get election results (only for COMPLETED elections)
  async getElectionResults(electionId: string): Promise<ElectionResultsDto> {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          orderBy: { order: 'asc' },
        },
        candidateLists: {
          include: {
            politicalParty: true,
            candidates: {
              include: {
                position: true,
              },
            },
          },
        },
        association: true,
        branch: true,
        chapter: true,
      },
    });

    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'COMPLETED') {
      throw new ForbiddenException('Results are only available for completed elections');
    }

    // Calculate total votes
    const totalVotes = election.candidateLists.reduce(
      (sum, list) => sum + list.candidates.reduce((s, c) => s + c.voteCount, 0),
      0,
    );

    // Calculate votes per position for percentage calculation
    const votesByPosition = new Map<string, number>();
    election.candidateLists.forEach((list) => {
      list.candidates.forEach((candidate) => {
        const currentVotes = votesByPosition.get(candidate.positionId) || 0;
        votesByPosition.set(candidate.positionId, currentVotes + candidate.voteCount);
      });
    });

    // Build candidate results with percentage per position
    const candidateResults: CandidateResultDto[] = [];
    election.candidateLists.forEach((list) => {
      list.candidates.forEach((candidate) => {
        const positionTotalVotes = votesByPosition.get(candidate.positionId) || 0;
        candidateResults.push({
          candidateId: candidate.id,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          positionId: candidate.positionId,
          positionTitle: candidate.position.title,
          listId: list.id,
          listName: list.name,
          partyName: list.politicalParty?.name,
          voteCount: candidate.voteCount,
          percentage: positionTotalVotes > 0 ? (candidate.voteCount / positionTotalVotes) * 100 : 0,
        });
      });
    });

    // Build list results
    const listResults: ListResultDto[] = election.candidateLists.map((list) => {
      const listTotalVotes = list.candidates.reduce((sum, c) => sum + c.voteCount, 0);
      return {
        listId: list.id,
        listName: list.name,
        listNumber: list.number,
        partyName: list.politicalParty?.name,
        totalVotes: listTotalVotes,
        percentage: totalVotes > 0 ? (listTotalVotes / totalVotes) * 100 : 0,
        candidates: candidateResults.filter((c) => c.listId === list.id),
      };
    });

    // Build position results
    const positionResults: PositionResultDto[] = election.positions.map((position) => {
      return {
        positionId: position.id,
        positionTitle: position.title,
        order: position.order,
        candidates: candidateResults.filter((c) => c.positionId === position.id),
      };
    });

    return {
      electionId: election.id,
      electionName: election.name,
      electionScope: election.scope,
      electionStatus: election.status,
      associationName: election.association.name,
      branchName: election.branch?.name,
      chapterName: election.chapter?.name,
      totalVotes,
      candidateResults,
      listResults,
      positionResults,
    };
  }

  // NEW: Get results grouped by position
  async getResultsByPosition(electionId: string): Promise<PositionResultDto[]> {
    const results = await this.getElectionResults(electionId);
    return results.positionResults;
  }

  // NEW: Get results grouped by list
  async getResultsByList(electionId: string): Promise<ListResultDto[]> {
    const results = await this.getElectionResults(electionId);
    return results.listResults;
  }
}
