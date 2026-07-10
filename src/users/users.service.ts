import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Password column is `select: false` on the entity, so this — used for the
  // register duplicate-email check — never touches the hash.
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Only the login flow needs the hash to run bcrypt.compare against it, so it's
  // the only query that opts back in via an explicit `select`.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, password: true, createdAt: true },
    });
  }

  create(data: Pick<User, 'email' | 'password'>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  // Only the refresh flow needs the stored hash to compare the incoming refresh
  // token against, so — same pattern as findByEmailWithPassword — it's the one
  // query that opts back into the `select: false` column.
  findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: { id: true, email: true, hashedRefreshToken: true },
    });
  }

  // Pass null to clear it (logout / revocation). Update, not save-with-load, since
  // no other field on the entity needs to be read or touched here.
  async setRefreshTokenHash(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { hashedRefreshToken });
  }
}
