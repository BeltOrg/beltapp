import { Module } from '@nestjs/common';
import { RealtimePubSubService } from './realtime-pubsub.service';

@Module({
  providers: [RealtimePubSubService],
  exports: [RealtimePubSubService],
})
export class RealtimeModule {}
