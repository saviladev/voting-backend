import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import {
  ElectionResultsDto,
  CandidateResultDto,
  ListResultDto,
  PositionResultDto,
} from './dto/results.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ElectionsService {
  constructor(private prisma: PrismaService) {}

  // =================================================================
  // == Member-specific methods
  // =================================================================

  async getVotableElections(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        chapter: {
          include: {
            branch: {
              include: {
                association: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const now = new Date();

    // Find all open elections relevant to the user's hierarchy
    const openElections = await this.prisma.election.findMany({
      where: {
        status: 'OPEN',
        startDate: { lte: now },
        endDate: { gte: now },
        // Filter by the user's association, and optionally by branch and chapter
        associationId: user.chapter.branch.associationId,
        OR: [
          { scope: 'ASSOCIATION' },
          { scope: 'BRANCH', branchId: user.chapter.branchId },
          { scope: 'CHAPTER', chapterId: user.chapterId },
        ],
      },
    });

    // Find all elections the user has already voted in
    const userVotes = await this.prisma.vote.findMany({
      where: { userId },
      select: { electionId: true },
    });
    const votedElectionIds = userVotes.map(v => v.electionId);

    // Filter out elections where the user has already voted
    return openElections.filter(e => !votedElectionIds.includes(e.id));
  }

  async vote(electionId: string, userId: string, candidateId: string) {
    const now = new Date();

    // 1. Fetch all required data in parallel
    const [election, user, candidate, existingVote] = await Promise.all([
      this.prisma.election.findUnique({ where: { id: electionId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          chapter: { include: { branch: true } },
        },
      }),
      this.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { candidateList: true },
      }),
      this.prisma.vote.findUnique({
        where: { userId_electionId: { userId, electionId } },
      }),
    ]);

    // 2. Perform validations
    if (!election) throw new NotFoundException('Election not found');
    if (election.status !== 'OPEN' || election.startDate > now || election.endDate < now) {
      throw new ForbiddenException('This election is not open for voting.');
    }
    if (!user || !user.isActive) throw new NotFoundException('User not found or is not active.');
    if (existingVote) throw new ForbiddenException('You have already voted in this election.');
    if (!candidate) throw new NotFoundException('Candidate not found.');
    if (candidate.candidateList.electionId !== electionId) {
      throw new ForbiddenException('This candidate does not belong to this election.');
    }

    // 3. Strong eligibility check
    const isEligible =
      election.associationId === user.chapter.branch.associationId &&
      (election.scope === 'ASSOCIATION' ||
        (election.scope === 'BRANCH' && election.branchId === user.chapter.branchId) ||
        (election.scope === 'CHAPTER' && election.chapterId === user.chapterId));

    if (!isEligible) {
      throw new ForbiddenException('You are not eligible to vote in this election.');
    }

    // 4. Execute transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the vote record
      const vote = await tx.vote.create({
        data: {
          electionId,
          userId,
          candidateId,
        },
      });

      // Increment the candidate's vote count
      await tx.candidate.update({
        where: { id: candidateId },
        data: {
          voteCount: {
            increment: 1,
          },
        },
      });

      return {
        message: 'Vote cast successfully',
        voteId: vote.id,
      };
    });
  }


  // =================================================================
  // == Admin-specific methods
  // =================================================================

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
