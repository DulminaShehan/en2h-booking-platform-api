import { validate } from 'class-validator';
import { IsFutureDate } from './is-future-date.validator';

// A minimal DTO exercising the actual decorator wiring (registerDecorator +
// class-validator's validate()), not just the internal constraint class in
// isolation — this is what proves the decorator works as it'll actually be used.
class TestDto {
  @IsFutureDate()
  date!: string;
}

describe('IsFutureDate', () => {
  // Fixed system time so "future"/"past"/"current instant" are deterministic
  // instead of depending on when the test happens to run.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2050-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes for a valid ISO 8601 date-time strictly in the future', async () => {
    const dto = new TestDto();
    dto.date = '2050-01-02T00:00:00.000Z';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails for a date-time in the past', async () => {
    const dto = new TestDto();
    dto.date = '2049-12-31T23:59:59.000Z';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isFutureDate');
  });

  it('fails for a date-time exactly equal to the current instant', async () => {
    const dto = new TestDto();
    dto.date = '2050-01-01T00:00:00.000Z';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('fails for an invalid, unparseable date string', async () => {
    const dto = new TestDto();
    dto.date = 'not-a-date';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('fails when the value is not a string at all', async () => {
    const dto = new TestDto();
    (dto as unknown as { date: number }).date = 12345;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('provides a clear validation message naming the property', async () => {
    const dto = new TestDto();
    dto.date = 'garbage';

    const errors = await validate(dto);

    expect(errors[0].constraints?.isFutureDate).toContain('date');
    expect(errors[0].constraints?.isFutureDate).toContain('future');
  });
});
