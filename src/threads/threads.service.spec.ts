import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThreadRepository } from './thread.repository';
import { ThreadsService } from './threads.service';

const AUTHOR = { id: 'user-1', username: 'johndoe' };
const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-09-02T00:00:00.000Z');

const THREAD = {
  id: 'thread-1',
  title: 'How do I set up environment variables?',
  content: 'I keep leaking API keys. How do I use dotenv?',
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  author: AUTHOR,
};

describe('ThreadsService', () => {
  let service: ThreadsService;
  let repository: {
    create: jest.Mock;
    findByIdWithAuthor: jest.Mock;
    list: jest.Mock;
    count: jest.Mock;
    listByUser: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findOwnerId: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findByIdWithAuthor: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
      listByUser: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOwnerId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ThreadsService,
        { provide: ThreadRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ThreadsService);
  });

  describe('create', () => {
    it('delegates to the repository and returns the thread', async () => {
      repository.create.mockResolvedValue(THREAD);
      const dto = { title: THREAD.title, content: THREAD.content };

      const result = await service.create(AUTHOR.id, dto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: AUTHOR.id,
        title: dto.title,
        content: dto.content,
      });
      expect(result).toEqual(THREAD);
    });
  });

  describe('findAll', () => {
    it('reports the requested page, limit, and total', async () => {
      repository.list.mockResolvedValue([THREAD]);
      repository.count.mockResolvedValue(42);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(repository.list).toHaveBeenCalledWith({ page: 3, limit: 10 });
      expect(result).toEqual({
        data: [THREAD],
        page: 3,
        limit: 10,
        total: 42,
      });
    });
  });

  describe('findMyThreads', () => {
    it('scopes the query to the current user', async () => {
      repository.listByUser.mockResolvedValue([THREAD]);

      const result = await service.findMyThreads(AUTHOR.id);

      expect(repository.listByUser).toHaveBeenCalledWith(AUTHOR.id);
      expect(result).toEqual([THREAD]);
    });
  });

  describe('findOne', () => {
    it('returns the thread with its author', async () => {
      repository.findByIdWithAuthor.mockResolvedValue(THREAD);

      await expect(service.findOne('thread-1')).resolves.toEqual(THREAD);
    });

    it('throws 404 when the thread does not exist', async () => {
      repository.findByIdWithAuthor.mockResolvedValue(null);

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
      repository.findOwnerId.mockResolvedValue(null);

      await expect(
        service.update(AUTHOR.id, 'missing', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('forbids a non-owner and does not update', async () => {
      repository.findOwnerId.mockResolvedValue('someone-else');

      await expect(
        service.update(AUTHOR.id, 'thread-1', dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates the thread when the requester owns it', async () => {
      repository.findOwnerId.mockResolvedValue(AUTHOR.id);
      repository.update.mockResolvedValue({ ...THREAD, ...dto });

      const result = await service.update(AUTHOR.id, 'thread-1', dto);

      expect(repository.update).toHaveBeenCalledWith('thread-1', {
        title: dto.title,
        content: dto.content,
      });
      expect(result.title).toBe(dto.title);
    });
  });

  describe('remove', () => {
    it('throws 404 and does not delete when the thread does not exist', async () => {
      repository.findOwnerId.mockResolvedValue(null);

      await expect(service.remove(AUTHOR.id, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('forbids a non-owner and does not delete', async () => {
      repository.findOwnerId.mockResolvedValue('someone-else');

      await expect(
        service.remove(AUTHOR.id, 'thread-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes the thread when the requester owns it', async () => {
      repository.findOwnerId.mockResolvedValue(AUTHOR.id);
      repository.delete.mockResolvedValue(undefined);

      await expect(
        service.remove(AUTHOR.id, 'thread-1'),
      ).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith('thread-1');
    });
  });
});
