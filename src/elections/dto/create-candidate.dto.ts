import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCandidateDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsNotEmpty()
  @IsUUID()
  candidateListId: string;

  @IsNotEmpty()
  @IsUUID()
  positionId: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
