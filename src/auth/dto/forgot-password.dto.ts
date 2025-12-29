import { IsString, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'dni must be 8 digits' })
  dni: string;
}
