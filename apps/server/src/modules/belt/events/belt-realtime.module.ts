import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { BeltRealtimeResolver } from './belt-realtime.resolver';
import { BeltRealtimeService } from './belt-realtime.service';

export const BELT_REALTIME_GRAPHQL_RESOLVERS = [BeltRealtimeResolver] as const;

@Module({
  imports: [AuthModule, RealtimeModule],
  providers: [...BELT_REALTIME_GRAPHQL_RESOLVERS, BeltRealtimeService],
  exports: [BeltRealtimeService],
})
export class BeltRealtimeModule {}
