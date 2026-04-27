import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateDogInput } from './dto/create-dog.input';
import { UpdateDogInput } from './dto/update-dog.input';
import { DogEntity } from './entities/dog.entity';

@Injectable()
export class DogsService {
  constructor(
    @InjectRepository(DogEntity)
    private readonly dogsRepository: Repository<DogEntity>,
    private readonly usersService: UsersService,
  ) {}

  async findMine(ownerId: number): Promise<DogEntity[]> {
    return this.dogsRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async requireOwnedDog(id: number, ownerId: number): Promise<DogEntity> {
    const dog = await this.dogsRepository.findOneBy({ id });
    if (!dog) {
      throw new NotFoundException({
        code: 'DOG_NOT_FOUND',
        message: 'Dog was not found.',
      });
    }

    if (dog.ownerId !== ownerId) {
      throw new ForbiddenException({
        code: 'DOG_FORBIDDEN',
        message: 'You can only access your own dogs.',
      });
    }

    return dog;
  }

  async create(ownerId: number, input: CreateDogInput): Promise<DogEntity> {
    const owner = await this.usersService.requireEntityById(ownerId);
    if (!owner.roles.includes(UserRole.OWNER)) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_REQUIRED',
        message: 'Owner role is required to manage dogs.',
      });
    }

    return this.dogsRepository.save(
      this.dogsRepository.create({
        ownerId,
        name: input.name,
        size: input.size,
        behaviorTags: input.behaviorTags ?? [],
        notes: input.notes ?? null,
      }),
    );
  }

  async update(
    id: number,
    ownerId: number,
    input: UpdateDogInput,
  ): Promise<DogEntity> {
    const dog = await this.requireOwnedDog(id, ownerId);

    if (input.name !== undefined) {
      dog.name = input.name;
    }

    if (input.size !== undefined) {
      dog.size = input.size;
    }

    if (input.behaviorTags !== undefined) {
      dog.behaviorTags = input.behaviorTags;
    }

    if (input.notes !== undefined) {
      dog.notes = input.notes;
    }

    return this.dogsRepository.save(dog);
  }

  async delete(id: number, ownerId: number): Promise<boolean> {
    await this.requireOwnedDog(id, ownerId);
    const result = await this.dogsRepository.delete({ id, ownerId });
    return (result.affected ?? 0) > 0;
  }
}
