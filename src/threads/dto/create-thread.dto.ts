import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({ example: 'How do I set up environment variables?' })
  @IsString()
  @Length(3, 200)
  title: string;

  @ApiProperty({ example: 'I keep leaking API keys. How do I use dotenv?' })
  @IsString()
  @Length(10, 5000)
  content: string;
}
