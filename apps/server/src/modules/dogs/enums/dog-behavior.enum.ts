import { registerEnumType } from '@nestjs/graphql';

export enum DogBehavior {
  FRIENDLY = 'FRIENDLY',
  REACTIVE = 'REACTIVE',
  AGGRESSIVE = 'AGGRESSIVE',
  NEEDS_EXPERIENCED_WALKER = 'NEEDS_EXPERIENCED_WALKER',
}

registerEnumType(DogBehavior, {
  name: 'DogBehavior',
});
