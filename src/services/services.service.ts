import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  create(dto: CreateServiceDto): Promise<Service> {
    const service = this.servicesRepository.create(dto);
    return this.servicesRepository.save(service);
  }

  findAll(): Promise<Service[]> {
    return this.servicesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    // Loads first (and 404s) rather than a blind `.update()` so the response can
    // return the full, merged entity instead of just an affected-row count.
    const service = await this.findOne(id);
    Object.assign(service, dto);
    return this.servicesRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const result = await this.servicesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Service ${id} not found`);
    }
  }
}
