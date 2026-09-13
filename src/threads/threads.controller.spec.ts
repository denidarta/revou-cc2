import { Test } from '@nestjs/testing';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

describe('ThreadsController', () => {
  let controller: ThreadsController;
  let threadsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findMyThreads: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: 'user-1', username: 'johndoe' };
  const dto = {
    title: 'How do I set up environment variables?',
    content: 'I keep leaking API keys. How do I use dotenv?',
  };

  beforeEach(async () => {
    threadsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findMyThreads: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ThreadsController],
      providers: [{ provide: ThreadsService, useValue: threadsService }],
    }).compile();

    controller = moduleRef.get(ThreadsController);
  });

  it('creates a thread for the authenticated user', async () => {
    const created = { id: 'thread-1' };
    threadsService.create.mockResolvedValue(created);

    await expect(controller.create(user, dto)).resolves.toBe(created);
    expect(threadsService.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('lists all threads with the pagination query', async () => {
    const pagination = { page: 2, limit: 5 };
    const page = { data: [], page: 2, limit: 5, total: 0 };
    threadsService.findAll.mockResolvedValue(page);

    await expect(controller.findAll(pagination)).resolves.toBe(page);
    expect(threadsService.findAll).toHaveBeenCalledWith(pagination);
  });

  it('lists the authenticated user threads', async () => {
    const mine = [{ id: 'thread-1' }];
    threadsService.findMyThreads.mockResolvedValue(mine);

    await expect(controller.findMyThreads(user)).resolves.toBe(mine);
    expect(threadsService.findMyThreads).toHaveBeenCalledWith(user.id);
  });

  it('fetches a single thread by id', async () => {
    const thread = { id: 'thread-1' };
    threadsService.findOne.mockResolvedValue(thread);

    await expect(controller.findOne('thread-1')).resolves.toBe(thread);
    expect(threadsService.findOne).toHaveBeenCalledWith('thread-1');
  });

  it('updates a thread as the authenticated user', async () => {
    const updated = { id: 'thread-1', ...dto };
    threadsService.update.mockResolvedValue(updated);

    await expect(controller.update(user, 'thread-1', dto)).resolves.toBe(
      updated,
    );
    expect(threadsService.update).toHaveBeenCalledWith(
      user.id,
      'thread-1',
      dto,
    );
  });

  it('removes a thread as the authenticated user', async () => {
    threadsService.remove.mockResolvedValue(undefined);

    await expect(controller.remove(user, 'thread-1')).resolves.toBeUndefined();
    expect(threadsService.remove).toHaveBeenCalledWith(user.id, 'thread-1');
  });
});
