import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateChapterDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  specialtyIds?: string[];

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name: string;
}
