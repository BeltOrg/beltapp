import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BeltEventType } from '../belt/events/belt-event-type.enum';
import { BeltRealtimeService } from '../belt/events/belt-realtime.service';
import { UserRole } from './enums/user-role.enum';
import { UserEntity } from './entities/user.entity';

type UsersRepository = {
  findOneBy(where: { id: number }): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
};
type UserEventPublisher = Pick<BeltRealtimeService, 'publishUserEvent'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: UsersRepository,
    @Inject(BeltRealtimeService)
    private readonly beltRealtimeService: UserEventPublisher,
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
    const savedUser = await this.usersRepository.save(user);
    await this.beltRealtimeService.publishUserEvent(
      BeltEventType.USER_UPDATED,
      savedUser,
    );

    return savedUser;
  }
}
