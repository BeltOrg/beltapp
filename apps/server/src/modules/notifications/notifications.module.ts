import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from './notifications.service';

export const NOTIFICATIONS_GRAPHQL_RESOLVERS = [NotificationsResolver] as const;

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserEntity]),
    AuthModule,
    RealtimeModule,
  ],
  providers: [NotificationsService, ...NOTIFICATIONS_GRAPHQL_RESOLVERS],
  exports: [NotificationsService],
})
export class NotificationsModule {}
