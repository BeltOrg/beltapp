import { Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAuthGuard } from './graphql-auth.guard';

@Resolver()
export class AuthResolver {
  @Mutation(() => Boolean)
  @UseGuards(GraphqlAuthGuard)
  logout(): boolean {
    return true;
  }
}
