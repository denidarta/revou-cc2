import { Module } from '@nestjs/common';
import { ThreadRepository } from './thread.repository';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  controllers: [ThreadsController],
  providers: [ThreadsService, ThreadRepository],
})
export class ThreadsModule {}
