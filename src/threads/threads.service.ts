import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from './dto/pagination.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ThreadRepository } from './thread.repository';

@Injectable()
export class ThreadsService {
  constructor(private readonly threads: ThreadRepository) {}

  create(userId: string, dto: CreateThreadDto) {
    return this.threads.create({
      userId,
      title: dto.title,
      content: dto.content,
    });
  }

  async findAll(pagination: PaginationDto) {
    const [threads, total] = await Promise.all([
      this.threads.list(pagination),
      this.threads.count(),
    ]);

    return {
      data: threads,
      page: pagination.page,
      limit: pagination.limit,
      total,
    };
  }

  findMyThreads(userId: string) {
    return this.threads.listByUser(userId);
  }

  async findOne(id: string) {
    const thread = await this.threads.findByIdWithAuthor(id);
    if (!thread) {
      throw new NotFoundException('thread not found');
    }
    return thread;
  }

  async update(userId: string, id: string, dto: UpdateThreadDto) {
    await this.assertOwner(userId, id);
    return this.threads.update(id, { title: dto.title, content: dto.content });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.threads.delete(id);
  }

  private async assertOwner(userId: string, id: string) {
    const ownerId = await this.threads.findOwnerId(id);

    if (!ownerId) {
      throw new NotFoundException('thread not found');
    }
    if (ownerId !== userId) {
      throw new ForbiddenException('you can only modify your own threads');
    }
  }
}
