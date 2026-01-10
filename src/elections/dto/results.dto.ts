export class CandidateResultDto {
  candidateId: string;
  candidateName: string;
  positionId: string;
  positionTitle: string;
  listId: string;
  listName: string;
  partyName?: string;
  voteCount: number;
  percentage: number;
}

export class ListResultDto {
  listId: string;
  listName: string;
  listNumber: number | null;
  partyName?: string;
  totalVotes: number;
  percentage: number;
  candidates: CandidateResultDto[];
}

export class PositionResultDto {
  positionId: string;
  positionTitle: string;
  order: number;
  candidates: CandidateResultDto[];
}

export class ElectionResultsDto {
  electionId: string;
  electionName: string;
  electionScope: string;
  electionStatus: string;
  associationName: string;
  branchName?: string;
  chapterName?: string;
  totalVotes: number;
  candidateResults: CandidateResultDto[];
  listResults: ListResultDto[];
  positionResults: PositionResultDto[];
}
