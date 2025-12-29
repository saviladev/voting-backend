import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateChapterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  specialtyIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;
}
