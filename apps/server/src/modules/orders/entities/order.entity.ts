import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DogEntity } from '../../dogs/entities/dog.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('walk_order')
@Index('idx_walk_order_owner_status', ['ownerId', 'status'])
@Index('idx_walk_order_walker_status', ['walkerId', 'status'])
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id', type: 'integer' })
  ownerId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;

  @Column({ name: 'walker_id', type: 'integer', nullable: true })
  walkerId!: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'walker_id' })
  walker!: UserEntity | null;

  @Column({ name: 'dog_id', type: 'integer' })
  dogId!: number;

  @ManyToOne(() => DogEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'dog_id' })
  dog!: DogEntity;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.CREATED,
  })
  status!: OrderStatus;

  @Column({ name: 'price_amount', type: 'integer' })
  priceAmount!: number;

  @Column({
    name: 'price_currency',
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  priceCurrency!: string;

  @Column({ name: 'location_lat', type: 'double precision' })
  locationLat!: number;

  @Column({ name: 'location_lng', type: 'double precision' })
  locationLng!: number;

  @Column({ name: 'location_address', type: 'varchar', length: 240 })
  locationAddress!: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;
}
