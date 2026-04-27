import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('order_review')
@Unique('uq_order_review_order_reviewer', ['orderId', 'reviewerId'])
@Check('chk_order_review_rating_range', '"rating" >= 1 AND "rating" <= 5')
@Index('idx_order_review_reviewee_id', ['revieweeId'])
export class ReviewEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'integer' })
  orderId!: number;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'reviewer_id', type: 'integer' })
  reviewerId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: UserEntity;

  @Column({ name: 'reviewee_id', type: 'integer' })
  revieweeId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewee_id' })
  reviewee!: UserEntity;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
