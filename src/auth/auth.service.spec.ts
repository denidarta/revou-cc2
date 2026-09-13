import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const REGISTER_DTO = {
  username: 'johndoe',
  email: 'johndoe@example.com',
  password: 'password123',
};

const LOGIN_DTO = {
  email: 'johndoe@example.com',
  password: 'password123',
};

const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };
    jwtService = { signAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('stores a bcrypt hash of the password, never the plaintext', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        username: REGISTER_DTO.username,
        email: REGISTER_DTO.email,
        passwordHash: 'placeholder',
        createdAt: CREATED_AT,
      });

      await service.register(REGISTER_DTO);

      const { passwordHash } = prisma.user.create.mock.calls[0][0].data;
      expect(passwordHash).not.toBe(REGISTER_DTO.password);
      await expect(bcrypt.compare(REGISTER_DTO.password, passwordHash)).resolves.toBe(
        true,
      );
    });

    it('returns the public fields and omits the password hash', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        username: REGISTER_DTO.username,
        email: REGISTER_DTO.email,
        passwordHash: 'super-secret-hash',
        createdAt: CREATED_AT,
      });

      const result = await service.register(REGISTER_DTO);

      expect(result).toEqual({
        id: 'user-1',
        username: REGISTER_DTO.username,
        email: REGISTER_DTO.email,
        createdAt: CREATED_AT,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('translates a unique-constraint violation into a 400', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(service.register(REGISTER_DTO)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rethrows unexpected persistence errors unchanged', async () => {
      const boom = new Error('connection lost');
      prisma.user.create.mockRejectedValue(boom);

      await expect(service.register(REGISTER_DTO)).rejects.toBe(boom);
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(LOGIN_DTO)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'johndoe',
        email: LOGIN_DTO.email,
        passwordHash: await bcrypt.hash('a-different-password', 10),
      });

      await expect(service.login(LOGIN_DTO)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('signs an access token carrying the user id and username', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'johndoe',
        email: LOGIN_DTO.email,
        passwordHash: await bcrypt.hash(LOGIN_DTO.password, 10),
      });
      jwtService.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.login(LOGIN_DTO);

      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        username: 'johndoe',
      });
    });
  });
});
