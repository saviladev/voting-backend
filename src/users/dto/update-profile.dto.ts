import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Required if newPassword is provided.' })
  @IsOptional()
  @IsString()
  @ValidateIf(o => o.newPassword)
  @Length(8, 100)
  oldPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 100)
  newPassword?: string;
}
