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

  @CreateDateColumn()
  createdAt: Date;
}
