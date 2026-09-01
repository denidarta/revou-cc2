import { ApiProperty } from '@nestjs/swagger';

export class ThreadAuthorDto {
  @ApiProperty({ example: '6f2b9a1e-3c4d-4b5a-8f7e-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;
}

export class ThreadResponseDto {
  @ApiProperty({ example: '6f2b9a1e-3c4d-4b5a-8f7e-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'How do I set up environment variables?' })
  title: string;

  @ApiProperty({ example: 'I keep leaking API keys. How do I use dotenv?' })
  content: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: ThreadAuthorDto })
  author: ThreadAuthorDto;
}

export class PaginatedThreadsDto {
  @ApiProperty({ type: [ThreadResponseDto] })
  data: ThreadResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;
}
