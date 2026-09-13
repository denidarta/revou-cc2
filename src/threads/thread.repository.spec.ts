import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadRepository } from './thread.repository';

const AUTHOR = { id: 'user-1', username: 'johndoe' };
const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-09-02T00:00:00.000Z');
const INCLUDE = { user: { select: { id: true, username: true } } };

const THREAD_ROW = {
  id: 'thread-1',
  userId: AUTHOR.id,
  title: 'How do I set up environment variables?',
  content: 'I keep leaking API keys. How do I use dotenv?',
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  user: AUTHOR,
};

const THREAD_DOMAIN = {
  id: THREAD_ROW.id,
  title: THREAD_ROW.title,
  content: THREAD_ROW.content,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  author: AUTHOR,
};

describe('ThreadRepository', () => {
  let repository: ThreadRepository;
  let prisma: {
    thread: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      thread: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ThreadRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = moduleRef.get(ThreadRepository);
  });

  describe('create', () => {
    it('persists the thread and maps the author', async () => {
      prisma.thread.create.mockResolvedValue(THREAD_ROW);

      const result = await repository.create({
        userId: AUTHOR.id,
        title: THREAD_ROW.title,
        content: THREAD_ROW.content,
      });

      expect(prisma.thread.create).toHaveBeenCalledWith({
        data: {
          userId: AUTHOR.id,
          title: THREAD_ROW.title,
          content: THREAD_ROW.content,
        },
        include: INCLUDE,
      });
      expect(result).toEqual(THREAD_DOMAIN);
    });
  });

  describe('findByIdWithAuthor', () => {
    it('returns the mapped thread', async () => {
      prisma.thread.findUnique.mockResolvedValue(THREAD_ROW);

      await expect(repository.findByIdWithAuthor('thread-1')).resolves.toEqual(
        THREAD_DOMAIN,
      );
      expect(prisma.thread.findUnique).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        include: INCLUDE,
      });
    });

    it('returns null when the thread does not exist', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);

      await expect(
        repository.findByIdWithAuthor('missing'),
      ).resolves.toBeNull();
    });
  });

  describe('list', () => {
    it('skips to the requested page and takes the limit', async () => {
      prisma.thread.findMany.mockResolvedValue([THREAD_ROW]);

      const result = await repository.list({ page: 3, limit: 10 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE,
      });
      expect(result).toEqual([THREAD_DOMAIN]);
    });

    it('does not skip on the first page', async () => {
      prisma.thread.findMany.mockResolvedValue([]);

      await repository.list({ page: 1, limit: 10 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe('count', () => {
    it('returns the total number of threads', async () => {
      prisma.thread.count.mockResolvedValue(42);

      await expect(repository.count()).resolves.toBe(42);
      expect(prisma.thread.count).toHaveBeenCalledWith();
    });
  });

  describe('listByUser', () => {
    it('scopes the query to the user', async () => {
      prisma.thread.findMany.mockResolvedValue([THREAD_ROW]);

      const result = await repository.listByUser(AUTHOR.id);

      expect(prisma.thread.findMany).toHaveBeenCalledWith({
        where: { userId: AUTHOR.id },
        orderBy: { createdAt: 'desc' },
        include: INCLUDE,
      });
      expect(result).toEqual([THREAD_DOMAIN]);
    });
  });

  describe('update', () => {
    it('updates and maps the thread', async () => {
      prisma.thread.update.mockResolvedValue({
        ...THREAD_ROW,
        title: 'Updated title',
      });

      const result = await repository.update('thread-1', {
        title: 'Updated title',
        content: 'Updated content',
      });

      expect(prisma.thread.update).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        data: { title: 'Updated title', content: 'Updated content' },
        include: INCLUDE,
      });
      expect(result.title).toBe('Updated title');
      expect(result.author).toEqual(AUTHOR);
    });
  });

  describe('delete', () => {
    it('deletes the thread by id', async () => {
      prisma.thread.delete.mockResolvedValue(THREAD_ROW);

      await expect(repository.delete('thread-1')).resolves.toBeUndefined();
      expect(prisma.thread.delete).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
      });
    });
  });

  describe('findOwnerId', () => {
    it('returns the owner id', async () => {
      prisma.thread.findUnique.mockResolvedValue({ userId: AUTHOR.id });

      await expect(repository.findOwnerId('thread-1')).resolves.toBe(AUTHOR.id);
      expect(prisma.thread.findUnique).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        select: { userId: true },
      });
    });

    it('returns null when the thread does not exist', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);

      await expect(repository.findOwnerId('missing')).resolves.toBeNull();
    });
  });
});
