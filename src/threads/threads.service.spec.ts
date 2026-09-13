import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsService } from './threads.service';

const AUTHOR = { id: 'user-1', username: 'johndoe' };
const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-09-02T00:00:00.000Z');

const THREAD_ROW = {
  id: 'thread-1',
  userId: AUTHOR.id,
  title: 'How do I set up environment variables?',
  content: 'I keep leaking API keys. How do I use dotenv?',
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  user: AUTHOR,
};

const THREAD_RESPONSE = {
  id: THREAD_ROW.id,
  title: THREAD_ROW.title,
  content: THREAD_ROW.content,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  author: AUTHOR,
};

describe('ThreadsService', () => {
  let service: ThreadsService;
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
      providers: [ThreadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ThreadsService);
  });

  describe('create', () => {
    it('persists the thread for the current user and maps the author', async () => {
      prisma.thread.create.mockResolvedValue(THREAD_ROW);
      const dto = { title: THREAD_ROW.title, content: THREAD_ROW.content };

      const result = await service.create(AUTHOR.id, dto);

      expect(prisma.thread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: AUTHOR.id,
            title: dto.title,
            content: dto.content,
          },
        }),
      );
      expect(result).toEqual(THREAD_RESPONSE);
    });
  });

  describe('findAll', () => {
    it('skips to the requested page and reports the total', async () => {
      prisma.thread.findMany.mockResolvedValue([THREAD_ROW]);
      prisma.thread.count.mockResolvedValue(42);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(42);
      expect(result.data).toEqual([THREAD_RESPONSE]);
    });

    it('does not skip on the first page', async () => {
      prisma.thread.findMany.mockResolvedValue([]);
      prisma.thread.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });

  describe('findMyThreads', () => {
    it('scopes the query to the current user', async () => {
      prisma.thread.findMany.mockResolvedValue([THREAD_ROW]);

      const result = await service.findMyThreads(AUTHOR.id);

      expect(prisma.thread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: AUTHOR.id } }),
      );
      expect(result).toEqual([THREAD_RESPONSE]);
    });
  });

  describe('findOne', () => {
    it('returns the thread with its author', async () => {
      prisma.thread.findUnique.mockResolvedValue(THREAD_ROW);

      await expect(service.findOne('thread-1')).resolves.toEqual(THREAD_RESPONSE);
    });

    it('throws 404 when the thread does not exist', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto = {
      title: 'Updated title',
      content: 'Updated content that is comfortably long enough.',
    };

    it('throws 404 and does not update when the thread does not exist', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);

      await expect(service.update(AUTHOR.id, 'missing', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.thread.update).not.toHaveBeenCalled();
    });

    it('forbids a non-owner and does not update', async () => {
      prisma.thread.findUnique.mockResolvedValue({ userId: 'someone-else' });

      await expect(
        service.update(AUTHOR.id, 'thread-1', dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.thread.update).not.toHaveBeenCalled();
    });

    it('updates the thread when the requester owns it', async () => {
      prisma.thread.findUnique.mockResolvedValue({ userId: AUTHOR.id });
      prisma.thread.update.mockResolvedValue({ ...THREAD_ROW, ...dto });

      const result = await service.update(AUTHOR.id, 'thread-1', dto);

      expect(prisma.thread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'thread-1' },
          data: { title: dto.title, content: dto.content },
        }),
      );
      expect(result.title).toBe(dto.title);
      expect(result.author).toEqual(AUTHOR);
    });
  });

  describe('remove', () => {
    it('throws 404 and does not delete when the thread does not exist', async () => {
      prisma.thread.findUnique.mockResolvedValue(null);

      await expect(service.remove(AUTHOR.id, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.thread.delete).not.toHaveBeenCalled();
    });

    it('forbids a non-owner and does not delete', async () => {
      prisma.thread.findUnique.mockResolvedValue({ userId: 'someone-else' });

      await expect(service.remove(AUTHOR.id, 'thread-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.thread.delete).not.toHaveBeenCalled();
    });

    it('deletes the thread when the requester owns it', async () => {
      prisma.thread.findUnique.mockResolvedValue({ userId: AUTHOR.id });
      prisma.thread.delete.mockResolvedValue(THREAD_ROW);

      await expect(service.remove(AUTHOR.id, 'thread-1')).resolves.toBeUndefined();
      expect(prisma.thread.delete).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
      });
    });
  });
});
