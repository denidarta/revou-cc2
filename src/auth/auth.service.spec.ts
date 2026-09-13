import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { DuplicateUserError } from '../users/user.errors';
import { UserRepository } from '../users/user.repository';
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

type CreateUserInput = {
  username: string;
  email: string;
  passwordHash: string;
};

type JwtPayload = { sub: string; username: string };

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    create: jest.MockedFunction<(input: CreateUserInput) => Promise<User>>;
    findByEmail: jest.MockedFunction<(email: string) => Promise<User | null>>;
  };
  let jwtService: {
    signAsync: jest.MockedFunction<(payload: JwtPayload) => Promise<string>>;
  };

  beforeEach(async () => {
    users = {
      create: jest.fn<Promise<User>, [CreateUserInput]>(),
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
    };
    jwtService = {
      signAsync: jest.fn<Promise<string>, [JwtPayload]>(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: users },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('stores a bcrypt hash of the password, never the plaintext', async () => {
      users.create.mockResolvedValue({
        id: 'user-1',
        username: REGISTER_DTO.username,
        email: REGISTER_DTO.email,
        passwordHash: 'placeholder',
        createdAt: CREATED_AT,
      });

      await service.register(REGISTER_DTO);

      const [input] = users.create.mock.calls[0];
      expect(input.passwordHash).not.toBe(REGISTER_DTO.password);
      await expect(
        bcrypt.compare(REGISTER_DTO.password, input.passwordHash),
      ).resolves.toBe(true);
    });

    it('passes the credentials to the repository', async () => {
      users.create.mockResolvedValue({
        id: 'user-1',
        username: REGISTER_DTO.username,
        email: REGISTER_DTO.email,
        passwordHash: 'super-secret-hash',
        createdAt: CREATED_AT,
      });

      await service.register(REGISTER_DTO);

      const [input] = users.create.mock.calls[0];
      expect(input.username).toBe(REGISTER_DTO.username);
      expect(input.email).toBe(REGISTER_DTO.email);
      expect(input.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('returns the public fields and omits the password hash', async () => {
      users.create.mockResolvedValue({
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

    it('translates DuplicateUserError into a 400', async () => {
      users.create.mockRejectedValue(new DuplicateUserError());

      await expect(service.register(REGISTER_DTO)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rethrows unexpected errors unchanged', async () => {
      const boom = new Error('connection lost');
      users.create.mockRejectedValue(boom);

      await expect(service.register(REGISTER_DTO)).rejects.toBe(boom);
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.login(LOGIN_DTO)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'user-1',
        username: 'johndoe',
        email: LOGIN_DTO.email,
        passwordHash: await bcrypt.hash('a-different-password', 10),
        createdAt: CREATED_AT,
      });

      await expect(service.login(LOGIN_DTO)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('signs an access token carrying the user id and username', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'user-1',
        username: 'johndoe',
        email: LOGIN_DTO.email,
        passwordHash: await bcrypt.hash(LOGIN_DTO.password, 10),
        createdAt: CREATED_AT,
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
