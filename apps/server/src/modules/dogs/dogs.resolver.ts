import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { GraphqlAuthGuard } from '../auth/graphql-auth.guard';
import { CreateDogInput } from './dto/create-dog.input';
import { Dog } from './dto/dog.model';
import { UpdateDogInput } from './dto/update-dog.input';
import { mapDog } from './dogs.mapper';
import { DogsService } from './dogs.service';

@Resolver(() => Dog)
@UseGuards(GraphqlAuthGuard)
export class DogsResolver {
  constructor(private readonly dogsService: DogsService) {}

  @Query(() => [Dog])
  async myDogs(@CurrentUserId() currentUserId: number): Promise<Dog[]> {
    return (await this.dogsService.findMine(currentUserId)).map(mapDog);
  }

  @Query(() => Dog)
  async dog(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Dog> {
    return mapDog(
      await this.dogsService.requireOwnedDog(Number(id), currentUserId),
    );
  }

  @Mutation(() => Dog)
  async createDog(
    @CurrentUserId() currentUserId: number,
    @Args('input') input: CreateDogInput,
  ): Promise<Dog> {
    return mapDog(await this.dogsService.create(currentUserId, input));
  }

  @Mutation(() => Dog)
  async updateDog(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateDogInput,
  ): Promise<Dog> {
    return mapDog(
      await this.dogsService.update(Number(id), currentUserId, input),
    );
  }

  @Mutation(() => Boolean)
  async deleteDog(
    @CurrentUserId() currentUserId: number,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.dogsService.delete(Number(id), currentUserId);
  }
}
