import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DuplicateUserError } from './user.errors';
import { UserRepository } from './user.repository';

const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');

const USER_ROW = {
  id: 'user-1',
  username: 'johndoe',
  email: 'johndoe@example.com',
  passwordHash: 'hashed-password',
  createdAt: CREATED_AT,
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repository = moduleRef.get(UserRepository);
  });

  describe('create', () => {
    it('passes the credentials through to Prisma', async () => {
      prisma.user.create.mockResolvedValue(USER_ROW);

      const result = await repository.create({
        username: USER_ROW.username,
        email: USER_ROW.email,
        passwordHash: USER_ROW.passwordHash,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: USER_ROW.username,
          email: USER_ROW.email,
          passwordHash: USER_ROW.passwordHash,
        },
      });
      expect(result).toEqual(USER_ROW);
    });

    it('translates a unique-constraint violation into DuplicateUserError', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        repository.create({ username: 'a', email: 'b', passwordHash: 'c' }),
      ).rejects.toBeInstanceOf(DuplicateUserError);
    });

    it('rethrows unexpected persistence errors unchanged', async () => {
      const boom = new Error('connection lost');
      prisma.user.create.mockRejectedValue(boom);

      await expect(
        repository.create({ username: 'a', email: 'b', passwordHash: 'c' }),
      ).rejects.toBe(boom);
    });
  });

  describe('findByEmail', () => {
    it('looks the user up by email and returns the full record', async () => {
      prisma.user.findUnique.mockResolvedValue(USER_ROW);

      await expect(repository.findByEmail(USER_ROW.email)).resolves.toEqual(
        USER_ROW,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: USER_ROW.email },
      });
    });

    it('returns null when no user matches', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        repository.findByEmail('missing@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findProfileById', () => {
    it('selects only the public profile fields', async () => {
      const profile = {
        id: USER_ROW.id,
        username: USER_ROW.username,
        createdAt: CREATED_AT,
      };
      prisma.user.findUnique.mockResolvedValue(profile);

      await expect(repository.findProfileById(USER_ROW.id)).resolves.toEqual(
        profile,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ROW.id },
        select: { id: true, username: true, createdAt: true },
      });
    });
  });
});
