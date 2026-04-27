import { User } from './dto/user.model';
import { UserEntity } from './entities/user.entity';

export function mapUser(entity: UserEntity): User {
  return {
    id: String(entity.id),
    phone: entity.phone,
    roles: entity.roles,
    rating: entity.rating,
    isVerified: entity.isVerified,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
