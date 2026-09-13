import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfile } from './entities/user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async findProfile(id: string): Promise<UserProfile> {
    const profile = await this.users.findProfileById(id);

    if (!profile) {
      throw new NotFoundException('user not found');
    }

    return profile;
  }
}
