import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { findProfile: jest.Mock };

  beforeEach(async () => {
    usersService = { findProfile: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('delegates to the service and returns its result', async () => {
    const profile = {
      id: 'user-1',
      username: 'johndoe',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    usersService.findProfile.mockResolvedValue(profile);

    await expect(controller.findOne('user-1')).resolves.toEqual(profile);
    expect(usersService.findProfile).toHaveBeenCalledWith('user-1');
  });
});
