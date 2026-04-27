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
import { UserEntity } from '../../users/entities/user.entity';
import { DogBehavior } from '../enums/dog-behavior.enum';
import { DogSize } from '../enums/dog-size.enum';

@Entity('dog')
@Index('idx_dog_owner_id', ['ownerId'])
export class DogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id', type: 'integer' })
  ownerId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({
    type: 'enum',
    enum: DogSize,
    enumName: 'dog_size',
  })
  size!: DogSize;

  @Column({
    name: 'behavior_tags',
    type: 'enum',
    enum: DogBehavior,
    enumName: 'dog_behavior',
    array: true,
    default: [],
  })
  behaviorTags!: DogBehavior[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
