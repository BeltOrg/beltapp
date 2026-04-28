jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;

  return {
    Column: decorator,
    CreateDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: decorator,
    PrimaryGeneratedColumn: decorator,
    Repository: class Repository {},
    UpdateDateColumn: decorator,
  };
});

import { BeltEventType } from '../belt/events/belt-event-type.enum';
import type { BeltRealtimeService } from '../belt/events/belt-realtime.service';
import { UserRole } from '../users/enums/user-role.enum';
import type { UsersService } from '../users/users.service';
import { DogSize } from './enums/dog-size.enum';
import { DogEntity } from './entities/dog.entity';
import { DogsService } from './dogs.service';
import type { Repository } from 'typeorm';

function buildDog(overrides: Partial<DogEntity> = {}): DogEntity {
  return {
    id: 5,
    ownerId: 1,
    name: 'Milo',
    size: DogSize.MEDIUM,
    behaviorTags: [],
    notes: null,
    createdAt: new Date('2026-04-27T10:00:00.000Z'),
    updatedAt: new Date('2026-04-27T10:00:00.000Z'),
    owner: undefined!,
    ...overrides,
  };
}

describe('DogsService', () => {
  function createHarness() {
    const dogsRepositoryMock = {
      create: jest.fn((dog: Partial<DogEntity>) => buildDog(dog)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn().mockResolvedValue(buildDog()),
      save: jest.fn(async (dog: DogEntity) => dog),
    };
    const usersServiceMock = {
      requireEntityById: jest.fn().mockResolvedValue({
        id: 1,
        roles: [UserRole.OWNER],
      }),
    };
    const beltRealtimeServiceMock = {
      publishDogEvent: jest.fn().mockResolvedValue(undefined),
    };

    const service = new DogsService(
      dogsRepositoryMock as unknown as Repository<DogEntity>,
      usersServiceMock as unknown as UsersService,
      beltRealtimeServiceMock as unknown as BeltRealtimeService,
    );

    return {
      beltRealtimeService: beltRealtimeServiceMock,
      dogsRepository: dogsRepositoryMock,
      service,
    };
  }

  it('publishes an event when a dog is created', async () => {
    const { beltRealtimeService, service } = createHarness();

    const dog = await service.create(1, {
      behaviorTags: [],
      name: 'Milo',
      notes: null,
      size: DogSize.MEDIUM,
    });

    expect(beltRealtimeService.publishDogEvent).toHaveBeenCalledWith(
      BeltEventType.DOG_CREATED,
      dog,
    );
  });

  it('publishes an event when a dog is updated', async () => {
    const { beltRealtimeService, service } = createHarness();

    const dog = await service.update(5, 1, {
      name: 'Milo Jr',
    });

    expect(beltRealtimeService.publishDogEvent).toHaveBeenCalledWith(
      BeltEventType.DOG_UPDATED,
      dog,
    );
  });

  it('publishes an event when a dog is deleted', async () => {
    const { beltRealtimeService, service } = createHarness();

    await expect(service.delete(5, 1)).resolves.toBe(true);
    expect(beltRealtimeService.publishDogEvent).toHaveBeenCalledWith(
      BeltEventType.DOG_DELETED,
      expect.objectContaining({ id: 5 }),
    );
  });
});
