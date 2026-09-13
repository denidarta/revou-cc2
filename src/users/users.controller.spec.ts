import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('returns only the public profile fields', async () => {
    const profile = {
      id: 'user-1',
      username: 'johndoe',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    prisma.user.findUnique.mockResolvedValue(profile);

    await expect(controller.findOne('user-1')).resolves.toEqual(profile);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, username: true, createdAt: true },
    });
  });

  it('throws 404 when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(controller.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
