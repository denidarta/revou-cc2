import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserProfile } from './entities/user.entity';
import { DuplicateUserError } from './user.errors';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash: input.passwordHash,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateUserError();
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findProfileById(id: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, createdAt: true },
    });
  }
}
