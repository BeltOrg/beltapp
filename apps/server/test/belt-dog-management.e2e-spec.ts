import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import {
  OTHER_OWNER_ID,
  OWNER_ID,
  WALKER_ONE_ID,
  createDog,
  expectGraphqlErrorCodes,
  requestCreateDog,
  requestDeleteDog,
  requestDog,
  requestMyDogs,
  requestUpdateDog,
  resetBeltFixture,
} from './belt-e2e-fixture';
import { createE2eApp } from './e2e-app';

describe('Belt dog management (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createE2eApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetBeltFixture(dataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      await resetBeltFixture(dataSource);
    }

    if (app) {
      await app.close();
    }
  });

  it('allows owners to manage their own dogs', async () => {
    const dog = await createDog(app, OWNER_ID, {
      name: 'Owner Dog',
      size: 'SMALL',
      behaviorTags: ['FRIENDLY'],
      notes: 'Initial note.',
    });

    const myDogsResponse = await requestMyDogs(app, OWNER_ID);
    expect(myDogsResponse.errors).toBeUndefined();
    expect(myDogsResponse.data?.myDogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: dog.id,
          ownerId: String(OWNER_ID),
          name: 'Owner Dog',
        }),
      ]),
    );

    const updateResponse = await requestUpdateDog(app, OWNER_ID, dog.id, {
      name: 'Updated Owner Dog',
      notes: null,
    });
    expect(updateResponse.errors).toBeUndefined();
    expect(updateResponse.data?.updateDog).toMatchObject({
      id: dog.id,
      ownerId: String(OWNER_ID),
      name: 'Updated Owner Dog',
      notes: null,
    });

    const deleteResponse = await requestDeleteDog(app, OWNER_ID, dog.id);
    expect(deleteResponse.errors).toBeUndefined();
    expect(deleteResponse.data?.deleteDog).toBe(true);
  });

  it('rejects non-owner role and cross-owner dog access', async () => {
    const dog = await createDog(app, OWNER_ID);

    const createAsWalkerResponse = await requestCreateDog(app, WALKER_ONE_ID, {
      name: 'Walker Dog',
    });
    expectGraphqlErrorCodes(createAsWalkerResponse, ['OWNER_ROLE_REQUIRED']);

    const readAsOtherOwnerResponse = await requestDog(
      app,
      OTHER_OWNER_ID,
      dog.id,
    );
    expectGraphqlErrorCodes(readAsOtherOwnerResponse, ['DOG_FORBIDDEN']);

    const updateAsOtherOwnerResponse = await requestUpdateDog(
      app,
      OTHER_OWNER_ID,
      dog.id,
      { name: 'Not Yours' },
    );
    expectGraphqlErrorCodes(updateAsOtherOwnerResponse, ['DOG_FORBIDDEN']);

    const deleteAsOtherOwnerResponse = await requestDeleteDog(
      app,
      OTHER_OWNER_ID,
      dog.id,
    );
    expectGraphqlErrorCodes(deleteAsOtherOwnerResponse, ['DOG_FORBIDDEN']);
  });
});
