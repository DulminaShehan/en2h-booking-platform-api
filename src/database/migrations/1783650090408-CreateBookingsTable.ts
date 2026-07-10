import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTable1783650090408 implements MigrationInterface {
  name = 'CreateBookingsTable1783650090408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerName" character varying(200) NOT NULL, "customerEmail" character varying(200) NOT NULL, "customerPhone" character varying(30) NOT NULL, "serviceId" uuid NOT NULL, "bookingDateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15a2431ec10d29dcd96c9563b6" ON "bookings"  ("serviceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fcc8ac54b33c1b2a9f1e9823a2" ON "bookings"  ("bookingDateTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48b267d894e32a25ebde4b207a" ON "bookings"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bookings_service_datetime_active" ON "bookings"  ("serviceId", "bookingDateTime") WHERE "status" != 'CANCELLED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_15a2431ec10d29dcd96c9563b65" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_15a2431ec10d29dcd96c9563b65"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_service_datetime_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_48b267d894e32a25ebde4b207a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fcc8ac54b33c1b2a9f1e9823a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15a2431ec10d29dcd96c9563b6"`,
    );
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
  }
}
