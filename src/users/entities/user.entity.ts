import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // select: false keeps the hash out of every default query (user lists, profile
  // lookups, etc.) — only UsersService#findByEmailWithPassword opts back in via an
  // explicit `select`, which is the one place (login) that actually needs it.
  @Column({ select: false })
  password: string;

  // Bcrypt hash of the currently-valid refresh token, never the raw token itself —
  // same rationale as `password`. Null means the user has no active refresh token
  // (never logged in, or explicitly logged out). Rotated on every successful
  // refresh so a stolen-then-used refresh token can't be replayed.
  @Column({ type: 'text', nullable: true, select: false })
  hashedRefreshToken?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
