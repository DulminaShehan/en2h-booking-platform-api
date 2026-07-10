import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const date = new Date(value);
    // Date.getTime() is milliseconds-since-epoch, i.e. an absolute instant — comparing
    // it to Date.now() compares actual points in time, not formatted local strings,
    // which is what makes this correct regardless of the request's timezone offset.
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid ISO 8601 date-time strictly in the future`;
  }
}

// DTO-layer check only. Time passes between this validation and the actual DB write
// (network latency, other middleware, queueing), so a value valid here can be in the
// past by the time BookingsService persists it — that's why BookingsService re-checks
// the same rule immediately before saving instead of trusting this decorator alone.
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}
