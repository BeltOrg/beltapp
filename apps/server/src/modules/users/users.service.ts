import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findEntityById(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async requireEntityById(id: number): Promise<UserEntity> {
    const user = await this.findEntityById(id);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User was not found.',
      });
    }

    return user;
  }

  async updateRoles(id: number, roles: UserRole[]): Promise<UserEntity> {
    const user = await this.requireEntityById(id);
    user.roles = [...new Set(roles)];
    return this.usersRepository.save(user);
  }
}
