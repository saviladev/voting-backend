import { IsInt, Min } from 'class-validator';

export class UpdateVoteCountDto {
  @IsInt()
  @Min(0)
  voteCount: number;
}
