import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

// node-postgres returns NUMERIC/DECIMAL columns as strings (JS numbers can't losslessly
// represent arbitrary-precision decimals), so without this every `price` read back from
// the DB would silently become a string instead of the `number` the entity declares.
// Exported (not just used inline) so it can be unit-tested directly — a mocked
// TypeORM repository never actually invokes column transformers, so testing it
// through ServicesService would prove nothing about this logic.
export const decimalTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string) =>
    value === undefined || value === null ? value : parseFloat(value),
};

@Entity('services')
export class Service {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Haircut' })
  @Column({ length: 200 })
  title: string;

  @ApiPropertyOptional({ example: 'A standard haircut and styling session.' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  @Column({ type: 'int' })
  duration: number;

  @ApiProperty({ example: 49.99 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  price: number;

  @ApiProperty({ default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
