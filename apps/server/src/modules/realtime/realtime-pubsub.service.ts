import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import Redis from 'ioredis';
import {
  isVerbosePubSubLoggingEnabled,
  logStructuredEvent,
} from '../../logging/structured-log';

type PubSubDriver = 'memory' | 'redis';

const REALTIME_REDIS_PATTERN = 'belt.*';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function reviveJsonDates(_key: string, value: unknown): unknown {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

@Injectable()
export class RealtimePubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimePubSubService.name);
  private readonly localPubSub = new PubSub();
  private readonly driver: PubSubDriver;

  private publisher?: Redis;
  private subscriber?: Redis;

  constructor(private readonly configService: ConfigService) {
    const configuredDriver = this.configService
      .get<string>('PUBSUB_DRIVER')
      ?.trim()
      .toLowerCase();

    this.driver = configuredDriver === 'redis' ? 'redis' : 'memory';
  }

  async onModuleInit(): Promise<void> {
    if (this.driver !== 'redis') {
      logStructuredEvent(
        this.logger,
        'log',
        'realtime_pubsub_driver_selected',
        {
          driver: this.driver,
        },
      );
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      const error = new Error('REDIS_URL is required when PUBSUB_DRIVER=redis');
      logStructuredEvent(
        this.logger,
        'error',
        'realtime_pubsub_init_failed',
        {
          driver: this.driver,
          reason: 'missing_redis_url',
        },
        error,
      );
      throw error;
    }

    this.publisher = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.subscriber = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });

    this.attachRedisLogging(this.publisher, 'publisher');
    this.attachRedisLogging(this.subscriber, 'subscriber');

    this.subscriber.on('pmessage', (_pattern, channel, payload) => {
      void this.handleRedisMessage(channel, payload);
    });

    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      await this.subscriber.psubscribe(REALTIME_REDIS_PATTERN);

      logStructuredEvent(
        this.logger,
        'log',
        'realtime_pubsub_driver_selected',
        {
          driver: this.driver,
          pattern: REALTIME_REDIS_PATTERN,
        },
      );
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'error',
        'realtime_pubsub_init_failed',
        {
          driver: this.driver,
          pattern: REALTIME_REDIS_PATTERN,
        },
        error,
      );

      await Promise.all([
        this.closeRedisClient(this.publisher, 'publisher'),
        this.closeRedisClient(this.subscriber, 'subscriber'),
      ]);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.closeRedisClient(this.publisher, 'publisher'),
      this.closeRedisClient(this.subscriber, 'subscriber'),
    ]);
  }

  async publish<TPayload extends object>(
    topic: string,
    payload: TPayload,
  ): Promise<void> {
    if (this.driver === 'redis') {
      await this.publishRedis(topic, payload);
      return;
    }

    await this.localPubSub.publish(topic, payload);
    if (isVerbosePubSubLoggingEnabled()) {
      logStructuredEvent(this.logger, 'log', 'realtime_pubsub_publish', {
        driver: this.driver,
        topic,
      });
    }
  }

  asyncIterator<TPayload>(topic: string): AsyncIterableIterator<TPayload> {
    return this.localPubSub.asyncIterableIterator<TPayload>(topic);
  }

  private async publishRedis<TPayload extends object>(
    topic: string,
    payload: TPayload,
  ): Promise<void> {
    if (!this.publisher) {
      throw new Error('Redis publisher is not initialized');
    }

    await this.publisher.publish(topic, JSON.stringify(payload));
    if (isVerbosePubSubLoggingEnabled()) {
      logStructuredEvent(this.logger, 'log', 'realtime_pubsub_publish', {
        driver: this.driver,
        topic,
      });
    }
  }

  private attachRedisLogging(client: Redis, role: string): void {
    client.on('error', (error) => {
      logStructuredEvent(
        this.logger,
        'error',
        'redis_client_error',
        {
          driver: this.driver,
          role,
        },
        error,
      );
    });

    client.on('reconnecting', () => {
      logStructuredEvent(this.logger, 'warn', 'redis_client_reconnecting', {
        driver: this.driver,
        role,
      });
    });

    client.on('ready', () => {
      logStructuredEvent(this.logger, 'log', 'redis_client_ready', {
        driver: this.driver,
        role,
      });
    });

    client.on('close', () => {
      logStructuredEvent(this.logger, 'warn', 'redis_client_closed', {
        driver: this.driver,
        role,
      });
    });
  }

  private async closeRedisClient(
    client: Redis | undefined,
    role: string,
  ): Promise<void> {
    if (!client) {
      return;
    }

    try {
      await client.quit();
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'warn',
        'redis_client_quit_failed',
        {
          driver: this.driver,
          role,
        },
        error,
      );
      client.disconnect();
    }
  }

  private async handleRedisMessage(
    topic: string,
    payload: string,
  ): Promise<void> {
    let parsedPayload: object;

    try {
      parsedPayload = JSON.parse(payload, reviveJsonDates) as object;
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'error',
        'realtime_pubsub_deliver_parse_failed',
        {
          driver: this.driver,
          topic,
        },
        error,
      );
      return;
    }

    try {
      await this.localPubSub.publish(topic, parsedPayload);
      if (isVerbosePubSubLoggingEnabled()) {
        logStructuredEvent(this.logger, 'log', 'realtime_pubsub_deliver', {
          driver: this.driver,
          topic,
        });
      }
    } catch (error) {
      logStructuredEvent(
        this.logger,
        'error',
        'realtime_pubsub_deliver_failed',
        {
          driver: this.driver,
          topic,
        },
        error,
      );
    }
  }
}
