import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let servicesService: ServicesService;

  const mockServicesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const buildService = (overrides: Partial<Service> = {}): Service => ({
    id: 'service-1',
    title: 'Haircut',
    description: 'A standard haircut',
    duration: 30,
    price: 49.99,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

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

  describe('create', () => {
    const dto: CreateServiceDto = {
      title: 'Haircut',
      description: 'A standard haircut',
      duration: 30,
      price: 49.99,
    };

    it('creates and saves a new service, returning the saved entity', async () => {
      // Arrange
      const created = buildService();
      mockServicesRepository.create.mockReturnValue(created);
      mockServicesRepository.save.mockResolvedValue(created);

      // Act
      const result = await servicesService.create(dto);

      // Assert
      expect(mockServicesRepository.create).toHaveBeenCalledWith(dto);
      expect(mockServicesRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('returns all services ordered newest-first', async () => {
      const services = [buildService({ id: 'a' }), buildService({ id: 'b' })];
      mockServicesRepository.find.mockResolvedValue(services);

      const result = await servicesService.findAll();

      expect(mockServicesRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(services);
    });

    it('returns an empty array when there are no services', async () => {
      mockServicesRepository.find.mockResolvedValue([]);

      const result = await servicesService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the service when found', async () => {
      const service = buildService();
      mockServicesRepository.findOne.mockResolvedValue(service);

      const result = await servicesService.findOne('service-1');

      expect(mockServicesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'service-1' },
      });
      expect(result).toEqual(service);
    });

    it('throws NotFoundException when service does not exist', async () => {
      const serviceId = '123';

      mockServicesRepository.findOne.mockResolvedValue(null);

      await expect(servicesService.findOne(serviceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('merges only the provided fields onto the existing service and saves it', async () => {
      const existing = buildService({ price: 49.99, isActive: true });
      mockServicesRepository.findOne.mockResolvedValue(existing);
      mockServicesRepository.save.mockImplementation((entity: Service) =>
        Promise.resolve(entity),
      );

      const result = await servicesService.update('service-1', {
        price: 59.99,
      });

      expect(mockServicesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'service-1',
          price: 59.99,
          // Untouched fields survive the merge, not just the one being updated.
          title: existing.title,
          isActive: true,
        }),
      );
      expect(result.price).toBe(59.99);
    });

    it('throws NotFoundException when the service to update does not exist', async () => {
      mockServicesRepository.findOne.mockResolvedValue(null);

      await expect(
        servicesService.update('missing-id', { price: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockServicesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing service without throwing', async () => {
      mockServicesRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(
        servicesService.remove('service-1'),
      ).resolves.toBeUndefined();
      expect(mockServicesRepository.delete).toHaveBeenCalledWith('service-1');
    });

    it('throws NotFoundException when the service to delete does not exist', async () => {
      mockServicesRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(servicesService.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
