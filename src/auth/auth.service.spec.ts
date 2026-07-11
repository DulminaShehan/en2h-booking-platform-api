import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

type SignedPayload = { sub: string; email: string; jti: string };

describe('AuthService', () => {
  let authService: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    create: jest.fn(),
    findByIdWithRefreshToken: jest.fn(),
    setRefreshTokenHash: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'jwt.refreshSecret') return 'refresh-secret';
      if (key === 'jwt.refreshExpiresIn') return '15m';
      throw new Error(`unexpected config key: ${key}`);
    }),
  };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'jane@example.com',
    password: 'hashed-password',
    hashedRefreshToken: null,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    // Default happy-path stubs; individual tests override where needed.
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'jwt.refreshSecret') return 'refresh-secret';
      if (key === 'jwt.refreshExpiresIn') return '15m';
      throw new Error(`unexpected config key: ${key}`);
    });
    mockJwtService.sign
      .mockReturnValueOnce('access-token-1')
      .mockReturnValueOnce('refresh-token-1');
  });

  describe('register', () => {
    const dto = { email: 'jane@example.com', password: 'Str0ngPassword!' };

    it('registers a new user and returns an access + refresh token pair', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser());

      // Act
      const result = await authService.register(dto);

      // Assert
      expect(result).toEqual({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      });
    });

    it('rejects a duplicate email with ConflictException', async () => {
      mockUsersService.findByEmail.mockResolvedValue(buildUser());

      await expect(authService.register(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('hashes the password before persisting, never passing the plaintext to the repository', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser());

      await authService.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        dto.password,
        expect.any(Number),
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: dto.email,
        password: 'hashed-password',
      });
      const createCalls = mockUsersService.create.mock.calls as Array<
        [{ email: string; password: string }]
      >;
      expect(createCalls[0][0].password).not.toBe(dto.password);
    });

    it('does not expose the password hash in the response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser());

      const result = await authService.register(dto);

      expect(result).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain('hashed-password');
    });

    it('signs the access token with sub/email/jti and no explicit expiry override', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser({ id: 'user-42' }));

      await authService.register(dto);

      const [accessCallPayload, accessCallOptions] = mockJwtService.sign.mock
        .calls[0] as [SignedPayload, Record<string, unknown> | undefined];
      expect(accessCallPayload).toMatchObject({
        sub: 'user-42',
        email: dto.email,
      });
      expect(accessCallPayload.jti).toEqual(expect.any(String));
      expect(accessCallOptions).toBeUndefined();
    });

    it('signs the refresh token with its own secret and expiry, separate from the access token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser({ id: 'user-42' }));

      await authService.register(dto);

      const [refreshCallPayload, refreshCallOptions] = mockJwtService.sign.mock
        .calls[1] as [SignedPayload, Record<string, unknown> | undefined];
      expect(refreshCallPayload).toMatchObject({
        sub: 'user-42',
        email: dto.email,
      });
      expect(refreshCallOptions).toEqual({
        secret: 'refresh-secret',
        expiresIn: '15m',
      });
    });

    it('stores a SHA-256 hash of the issued refresh token, not the raw token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(buildUser({ id: 'user-42' }));

      await authService.register(dto);

      const expectedHash = createHash('sha256')
        .update('refresh-token-1')
        .digest('hex');
      expect(mockUsersService.setRefreshTokenHash).toHaveBeenCalledWith(
        'user-42',
        expectedHash,
      );
    });
  });

  describe('login', () => {
    const dto = { email: 'jane@example.com', password: 'Str0ngPassword!' };

    it('logs in with correct credentials and returns a token pair', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(buildUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      });
    });

    it('rejects an unknown email with UnauthorizedException', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects a wrong password with UnauthorizedException', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(buildUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('compares the submitted password against the stored hash via bcrypt', async () => {
      const user = buildUser({ password: 'stored-hash' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await authService.login(dto);

      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, 'stored-hash');
    });

    it('does not expose the password hash in the response', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(buildUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(dto);

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('refresh', () => {
    it('issues a new token pair when the refresh token matches the stored hash', async () => {
      const rawRefreshToken = 'previously-issued-refresh-token';
      const storedHash = createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue(
        buildUser({ hashedRefreshToken: storedHash }),
      );

      const result = await authService.refresh('user-1', rawRefreshToken);

      expect(result).toEqual({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      });
    });

    it('rejects when the user has no stored refresh token hash (never logged in / already logged out)', async () => {
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue(
        buildUser({ hashedRefreshToken: null }),
      );

      await expect(authService.refresh('user-1', 'some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the user does not exist', async () => {
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue(null);

      await expect(
        authService.refresh('missing-user', 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that does not match the stored hash (rotated-away or forged)', async () => {
      const storedHash = createHash('sha256')
        .update('the-real-token')
        .digest('hex');
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue(
        buildUser({ hashedRefreshToken: storedHash }),
      );

      await expect(
        authService.refresh('user-1', 'a-different-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rotates the stored hash to the newly issued refresh token', async () => {
      const rawRefreshToken = 'previously-issued-refresh-token';
      const storedHash = createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');
      mockUsersService.findByIdWithRefreshToken.mockResolvedValue(
        buildUser({ id: 'user-1', hashedRefreshToken: storedHash }),
      );

      await authService.refresh('user-1', rawRefreshToken);

      const expectedNewHash = createHash('sha256')
        .update('refresh-token-1')
        .digest('hex');
      expect(mockUsersService.setRefreshTokenHash).toHaveBeenCalledWith(
        'user-1',
        expectedNewHash,
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token hash', async () => {
      await authService.logout('user-1');

      expect(mockUsersService.setRefreshTokenHash).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });
});
