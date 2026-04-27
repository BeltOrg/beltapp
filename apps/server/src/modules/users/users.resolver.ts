import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { GraphqlAuthGuard } from '../auth/graphql-auth.guard';
import { User } from './dto/user.model';
import { UpdateMyRolesInput } from './dto/update-my-roles.input';
import { mapUser } from './users.mapper';
import { UsersService } from './users.service';

@Resolver(() => User)
@UseGuards(GraphqlAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  async me(@CurrentUserId() currentUserId: number): Promise<User> {
    return mapUser(await this.usersService.requireEntityById(currentUserId));
  }

  @Mutation(() => User)
  async updateMyRoles(
    @CurrentUserId() currentUserId: number,
    @Args('input') input: UpdateMyRolesInput,
  ): Promise<User> {
    const user = await this.usersService.updateRoles(
      currentUserId,
      input.roles,
    );
    return mapUser(user);
  }
}
