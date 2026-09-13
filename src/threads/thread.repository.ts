import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadWithAuthor } from './entities/thread.entity';

const threadInclude = {
  user: { select: { id: true, username: true } },
} as const;

type ThreadRow = Prisma.ThreadGetPayload<{
  include: typeof threadInclude;
}>;

@Injectable()
export class ThreadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    title: string;
    content: string;
  }): Promise<ThreadWithAuthor> {
    const thread = await this.prisma.thread.create({
      data: {
        userId: input.userId,
        title: input.title,
        content: input.content,
      },
      include: threadInclude,
    });
    return this.toThread(thread);
  }

  async findByIdWithAuthor(id: string): Promise<ThreadWithAuthor | null> {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      include: threadInclude,
    });
    return thread ? this.toThread(thread) : null;
  }

  async list(pagination: {
    page: number;
    limit: number;
  }): Promise<ThreadWithAuthor[]> {
    const threads = await this.prisma.thread.findMany({
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: threadInclude,
    });
    return threads.map((thread) => this.toThread(thread));
  }

  count(): Promise<number> {
    return this.prisma.thread.count();
  }

  async listByUser(userId: string): Promise<ThreadWithAuthor[]> {
    const threads = await this.prisma.thread.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: threadInclude,
    });
    return threads.map((thread) => this.toThread(thread));
  }

  async update(
    id: string,
    data: { title: string; content: string },
  ): Promise<ThreadWithAuthor> {
    const thread = await this.prisma.thread.update({
      where: { id },
      data,
      include: threadInclude,
    });
    return this.toThread(thread);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.thread.delete({ where: { id } });
  }

  async findOwnerId(id: string): Promise<string | null> {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: { userId: true },
    });
    return thread?.userId ?? null;
  }

  private toThread(thread: ThreadRow): ThreadWithAuthor {
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
