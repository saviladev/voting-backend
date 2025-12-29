import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateBranchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  associationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;
}
