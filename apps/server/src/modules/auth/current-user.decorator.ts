import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { BeltGraphqlContext } from './auth-context';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number | null => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext<BeltGraphqlContext>().currentUserId;
  },
);
