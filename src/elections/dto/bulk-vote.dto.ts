import { IsNotEmpty, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class VoteSelectionDto {
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;

  @IsNotEmpty()
  @IsUUID()
  electionPositionId: string;
}

export class BulkVoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoteSelectionDto)
  selections: VoteSelectionDto[];
}
