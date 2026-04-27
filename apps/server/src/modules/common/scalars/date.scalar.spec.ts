import { Kind } from 'graphql';
import { DateScalar } from './date.scalar';

describe('DateScalar', () => {
  const scalar = new DateScalar();

  it('parses numeric timestamps', () => {
    expect(scalar.parseValue(1777629600000)).toEqual(
      new Date('2026-05-01T10:00:00.000Z'),
    );
  });

  it('parses ISO strings', () => {
    expect(scalar.parseValue('2026-05-01T10:00:00.000Z')).toEqual(
      new Date('2026-05-01T10:00:00.000Z'),
    );
  });

  it('rejects invalid dates', () => {
    expect(() => scalar.parseValue('not-a-date')).toThrow(
      'DateScalar can only parse valid dates',
    );
  });

  it('serializes dates as numeric timestamps', () => {
    expect(scalar.serialize(new Date('2026-05-01T10:00:00.000Z'))).toBe(
      1777629600000,
    );
  });

  it('parses literal int and string values', () => {
    expect(
      scalar.parseLiteral({
        kind: Kind.INT,
        value: '1777629600000',
      }),
    ).toEqual(new Date('2026-05-01T10:00:00.000Z'));
    expect(
      scalar.parseLiteral({
        kind: Kind.STRING,
        value: '2026-05-01T10:00:00.000Z',
      }),
    ).toEqual(new Date('2026-05-01T10:00:00.000Z'));
  });
});
