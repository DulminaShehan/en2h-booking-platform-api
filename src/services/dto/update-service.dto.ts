import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

// @nestjs/swagger's PartialType (not class-validator's) makes every inherited
// field optional for PATCH semantics while also carrying over the @ApiProperty
// metadata, so the generated Swagger schema stays accurate.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
