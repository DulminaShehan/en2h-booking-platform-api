import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { method: string; url: string };
  let mockHost: ArgumentsHost;

  // A single, controlled cast point instead of repeating `as Record<...>` at every
  // call site — mockResponse.json is an untyped jest.fn(), so .mock.calls is any[][].
  const getResponseBody = (): Record<string, unknown> =>
    (mockResponse.json.mock.calls as Array<[Record<string, unknown>]>)[0][0];

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = { method: 'GET', url: '/services/123' };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('formats a NestJS HttpException into the standard { statusCode, message, error, timestamp, path } shape', () => {
    const exception = new NotFoundException('Service 123 not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = getResponseBody();
    expect(body).toMatchObject({
      statusCode: 404,
      message: 'Service 123 not found',
      error: 'Not Found',
      path: '/services/123',
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(() =>
      new Date(body.timestamp as string).toISOString(),
    ).not.toThrow();
  });

  it('converts an unexpected non-HTTP Error into a generic 500 without leaking internal details', () => {
    const exception = new Error(
      'connection terminated: password=hunter2 leaked in stack',
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = getResponseBody();
    expect(body.message).toBe('Internal server error');
    expect(body.error).toBe('Internal Server Error');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('handles a thrown non-Error value (e.g. a plain string) as a generic 500 too', () => {
    // exercising a non-Error rejection to cover the exception.stack vs
    // String(exception) branch in the filter's logging.
    filter.catch('a plain string was thrown, not an Error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = getResponseBody();
    expect(body.message).toBe('Internal server error');
  });

  it('falls back to the exception message and status phrase when the HttpException payload omits them', () => {
    // An HttpException whose object payload has neither `message` nor `error`
    // exercises the `message ?? exception.message` and `error ?? STATUS_CODES[status]`
    // fallbacks, as opposed to the common case where the payload supplies both.
    const exception = new HttpException(
      { statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    const body = getResponseBody();
    expect(body.message).toBe(exception.message);
    expect(body.error).toBe('Bad Request');
  });

  it('preserves a validation-error array message instead of flattening it to one string', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: [
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    const body = getResponseBody();
    expect(body.message).toEqual([
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ]);
  });

  it('uses the same title-case error text for a bare-string HttpException as for an object one', () => {
    // Regression test: a bare HttpException(string, status) — the shape Passport's
    // AuthGuard default rejection produces — has getResponse() return a plain
    // string, not an object. The filter used to fall back to HttpStatus[401]
    // (the enum KEY, "UNAUTHORIZED") for this path while object-shaped exceptions
    // got the proper phrase ("Unauthorized") from their own payload — same status,
    // inconsistent casing. Fixed by falling back to node:http's STATUS_CODES map.
    const bareException = new HttpException(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
    );

    filter.catch(bareException, mockHost);

    const body = getResponseBody();
    expect(body.error).toBe('Unauthorized');
    expect(body.error).not.toBe('UNAUTHORIZED');
  });

  it('includes the request path of the specific request that failed', () => {
    mockRequest.url = '/bookings/abc-123/status';
    const exception = new BadRequestException('Cannot transition booking');

    filter.catch(exception, mockHost);

    const body = getResponseBody();
    expect(body.path).toBe('/bookings/abc-123/status');
  });
});
