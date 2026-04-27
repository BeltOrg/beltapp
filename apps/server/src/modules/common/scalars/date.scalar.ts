import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', () => Date)
export class DateScalar implements CustomScalar<number | string, Date> {
  description = 'Date custom scalar type';

  parseValue(value: unknown): Date {
    if (value instanceof Date) {
      return this.parseDate(value.getTime());
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return this.parseDate(value);
    }

    throw new TypeError('DateScalar can only parse numbers or strings');
  }

  serialize(value: unknown): number {
    if (!(value instanceof Date)) {
      throw new TypeError('DateScalar can only serialize Date instances');
    }
    return value.getTime(); // value sent to the client
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
      return this.parseDate(Number(ast.value));
    }

    if (ast.kind === Kind.STRING) {
      return this.parseDate(ast.value);
    }

    throw new TypeError('DateScalar can only parse int or string literals');
  }

  private parseDate(value: number | string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError('DateScalar can only parse valid dates');
    }

    return date;
  }
}
