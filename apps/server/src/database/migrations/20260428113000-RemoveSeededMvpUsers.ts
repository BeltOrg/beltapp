import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSeededMvpUsers20260428113000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM belt_user user_to_delete
      WHERE (user_to_delete.id, user_to_delete.phone) IN (
        (1, '+3725550001'),
        (2, '+3725550002'),
        (3, '+3725550003')
      )
        AND NOT EXISTS (
          SELECT 1 FROM auth_account
          WHERE auth_account.user_id = user_to_delete.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM dog
          WHERE dog.owner_id = user_to_delete.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM walk_order
          WHERE walk_order.owner_id = user_to_delete.id
             OR walk_order.walker_id = user_to_delete.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM order_review
          WHERE order_review.reviewer_id = user_to_delete.id
             OR order_review.reviewee_id = user_to_delete.id
        )
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('belt_user', 'id'),
        COALESCE((SELECT MAX(id) FROM belt_user), 1),
        (SELECT COUNT(*) > 0 FROM belt_user)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO belt_user (id, phone, roles, is_verified)
      VALUES
        (1, '+3725550001', ARRAY['OWNER']::belt_user_role[], true),
        (2, '+3725550002', ARRAY['WALKER']::belt_user_role[], true),
        (3, '+3725550003', ARRAY['OWNER', 'WALKER']::belt_user_role[], true)
      ON CONFLICT (id) DO NOTHING
    `);
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('belt_user', 'id'),
        GREATEST((SELECT COALESCE(MAX(id), 1) FROM belt_user), 3),
        true
      )
    `);
  }
}
