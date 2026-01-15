import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCandidateListDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  number?: number;

  @IsNotEmpty()
  @IsUUID()
  electionId: string;

  @IsOptional()
  @IsUUID()
  politicalPartyId?: string;
}
