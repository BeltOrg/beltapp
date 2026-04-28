import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BeltRealtimeModule } from '../belt/events/belt-realtime.module';
import { UsersModule } from '../users/users.module';
import { DogEntity } from './entities/dog.entity';
import { DogsResolver } from './dogs.resolver';
import { DogsService } from './dogs.service';

export const DOGS_GRAPHQL_RESOLVERS = [DogsResolver] as const;

@Module({
  imports: [
    TypeOrmModule.forFeature([DogEntity]),
    AuthModule,
    BeltRealtimeModule,
    UsersModule,
  ],
  providers: [DogsService, ...DOGS_GRAPHQL_RESOLVERS],
  exports: [DogsService, TypeOrmModule],
})
export class DogsModule {}
