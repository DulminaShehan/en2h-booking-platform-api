import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHashedRefreshTokenToUsers1783682021471 implements MigrationInterface {
  name = 'AddHashedRefreshTokenToUsers1783682021471';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "hashedRefreshToken" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "hashedRefreshToken"`,
    );
  }
}
