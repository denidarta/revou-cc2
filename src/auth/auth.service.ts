import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DuplicateUserError } from '../users/user.errors';
import { UserRepository } from '../users/user.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_COST = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      const user = await this.users.create({
        username: dto.username,
        email: dto.email,
        passwordHash,
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (error instanceof DuplicateUserError) {
        throw new BadRequestException('username or email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
