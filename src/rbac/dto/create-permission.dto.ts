import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
