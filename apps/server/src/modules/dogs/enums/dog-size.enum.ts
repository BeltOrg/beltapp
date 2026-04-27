import { registerEnumType } from '@nestjs/graphql';

export enum DogSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

registerEnumType(DogSize, {
  name: 'DogSize',
});
