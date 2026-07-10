import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterServicesTableDescriptionNullable1783649164179 implements MigrationInterface {
  name = 'AlterServicesTableDescriptionNullable1783649164179';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER COLUMN ... TYPE in place (not DROP + ADD, which TypeORM's diff
    // generator produces by default) — preserves existing row data instead of
    // silently discarding it.
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "title" TYPE character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "description" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: this will fail if any row has description = NULL by the time it
    // runs, since SET NOT NULL requires every existing value to satisfy it.
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "description" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "title" TYPE character varying`,
    );
  }
}
