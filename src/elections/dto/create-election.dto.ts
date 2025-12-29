import { IsArray, IsDate, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartyScope } from '@prisma/client';

export class CreateElectionPositionDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  order: number;
}

export class CreateElectionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @IsEnum(PartyScope)
  scope: PartyScope;

  @IsNotEmpty()
  @IsUUID()
  associationId: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateElectionPositionDto)
  positions: CreateElectionPositionDto[];
}
