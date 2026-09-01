import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { PaginationDto } from './dto/pagination.dto';

const threadInclude = {
  user: { select: { id: true, username: true } },
} as const;

type ThreadWithAuthor = Prisma.ThreadGetPayload<{
  include: typeof threadInclude;
}>;

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateThreadDto) {
    const thread = await this.prisma.thread.create({
      data: { userId, title: dto.title, content: dto.content },
      include: threadInclude,
    });
    return this.toResponse(thread);
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: threadInclude,
      }),
      this.prisma.thread.count(),
    ]);

    return {
      data: threads.map((thread) => this.toResponse(thread)),
      page: pagination.page,
      limit: pagination.limit,
      total,
    };
  }

  async findMyThreads(userId: string) {
    const threads = await this.prisma.thread.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: threadInclude,
    });
    return threads.map((thread) => this.toResponse(thread));
  }

  async findOne(id: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      include: threadInclude,
    });
    if (!thread) {
      throw new NotFoundException('thread not found');
    }
    return this.toResponse(thread);
  }

  async update(userId: string, id: string, dto: UpdateThreadDto) {
    await this.assertOwner(userId, id);

    const thread = await this.prisma.thread.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
      include: threadInclude,
    });
    return this.toResponse(thread);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.thread.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!thread) {
      throw new NotFoundException('thread not found');
    }
    if (thread.userId !== userId) {
      throw new ForbiddenException('you can only modify your own threads');
    }
  }

  private toResponse(thread: ThreadWithAuthor) {
    return {
      id: thread.id,
      title: thread.title,
      content: thread.content,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      author: thread.user,
    };
  }
}
