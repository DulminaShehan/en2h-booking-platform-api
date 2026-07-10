import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';

describe('ServicesService', () => {
  let servicesService: ServicesService;

  const mockServicesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getRepositoryToken(Service),
          useValue: mockServicesRepository,
        },
      ],
    }).compile();

    servicesService = module.get<ServicesService>(ServicesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(servicesService).toBeDefined();
  });

  it('should throw NotFoundException when service does not exist', async () => {
    // Arrange
    const serviceId = '123';

    mockServicesRepository.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(
      servicesService.findOne(serviceId),
    ).rejects.toThrow(NotFoundException);
  });
});