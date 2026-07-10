import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';

// Guard + bearer scheme applied at the controller level: every route here requires
// a logged-in user, and Swagger shows the padlock + accepts a token in "Try it out".
@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service' })
  @ApiCreatedResponse({ type: Service })
  create(@Body() dto: CreateServiceDto): Promise<Service> {
    return this.servicesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all services' })
  @ApiOkResponse({ type: [Service] })
  findAll(): Promise<Service[]> {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiOkResponse({ type: Service })
  @ApiNotFoundResponse({ description: 'Service not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Service> {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiOkResponse({ type: Service })
  @ApiNotFoundResponse({ description: 'Service not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<Service> {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Service not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicesService.remove(id);
  }
}
