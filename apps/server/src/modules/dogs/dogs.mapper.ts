import { Dog } from './dto/dog.model';
import { DogEntity } from './entities/dog.entity';

export function mapDog(entity: DogEntity): Dog {
  return {
    id: String(entity.id),
    ownerId: String(entity.ownerId),
    name: entity.name,
    size: entity.size,
    behaviorTags: entity.behaviorTags,
    notes: entity.notes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
