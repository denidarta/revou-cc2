import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { UsersService } from './users.service';

const PROFILE = {
  id: 'user-1',
  username: 'johndoe',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
};

describe('UsersService', () => {
  let service: UsersService;
  let users: { findProfileById: jest.Mock };

  beforeEach(async () => {
    users = { findProfileById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UserRepository, useValue: users }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('returns the profile from the repository', async () => {
    users.findProfileById.mockResolvedValue(PROFILE);

    await expect(service.findProfile('user-1')).resolves.toEqual(PROFILE);
    expect(users.findProfileById).toHaveBeenCalledWith('user-1');
  });

  it('throws 404 when the user does not exist', async () => {
    users.findProfileById.mockResolvedValue(null);

    await expect(service.findProfile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
