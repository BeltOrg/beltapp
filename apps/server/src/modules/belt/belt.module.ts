import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DogsModule } from '../dogs/dogs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DogsModule,
    OrdersModule,
    ReviewsModule,
    NotificationsModule,
  ],
})
export class BeltModule {}
