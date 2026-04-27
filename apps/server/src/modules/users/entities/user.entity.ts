import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('belt_user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  phone!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'belt_user_role',
    array: true,
    default: [],
  })
  roles!: UserRole[];

  @Column({ type: 'double precision', default: 0 })
  rating!: number;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
