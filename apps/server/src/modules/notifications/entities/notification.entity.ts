import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('user_notification')
@Index('idx_user_notification_recipient_created_at', [
  'recipientId',
  'createdAt',
])
@Index('idx_user_notification_recipient_read_at', ['recipientId', 'readAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'recipient_id', type: 'integer' })
  recipientId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: UserEntity;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type',
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 300 })
  body!: string;

  @Column({ name: 'action_url', type: 'varchar', length: 200, nullable: true })
  actionUrl!: string | null;

  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId!: number | null;

  @ManyToOne(() => OrderEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({ name: 'actor_id', type: 'integer', nullable: true })
  actorId!: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor!: UserEntity | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
