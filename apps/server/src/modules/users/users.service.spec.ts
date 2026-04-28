jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;

  return {
    Column: decorator,
    CreateDateColumn: decorator,
    Entity: decorator,
    PrimaryGeneratedColumn: decorator,
    Repository: class Repository {},
    UpdateDateColumn: decorator,
  };
});

import { BeltEventType } from '../belt/events/belt-event-type.enum';
import { UserRole } from './enums/user-role.enum';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 1,
    phone: '+15550000001',
    roles: [UserRole.OWNER],
    rating: 0,
    isVerified: false,
    createdAt: new Date('2026-04-27T10:00:00.000Z'),
    updatedAt: new Date('2026-04-27T10:00:00.000Z'),
    ...overrides,
  };
}

describe('UsersService', () => {
  function createHarness() {
    const usersRepositoryMock = {
      findOneBy: jest.fn().mockResolvedValue(buildUser()),
      save: jest.fn(async (user: UserEntity) => user),
    };
    const beltRealtimeServiceMock = {
      publishUserEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(
      usersRepositoryMock,
      beltRealtimeServiceMock,
    );

    return {
      beltRealtimeService: beltRealtimeServiceMock,
      service,
      usersRepository: usersRepositoryMock,
    };
  }

  it('publishes an event when roles are updated', async () => {
    const { beltRealtimeService, service } = createHarness();

    const user = await service.updateRoles(1, [
      UserRole.OWNER,
      UserRole.WALKER,
    ]);

    expect(user.roles).toEqual([UserRole.OWNER, UserRole.WALKER]);
    expect(beltRealtimeService.publishUserEvent).toHaveBeenCalledWith(
      BeltEventType.USER_UPDATED,
      user,
    );
  });
});
