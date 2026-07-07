import { isPostgresMode, query } from './db';

export async function ensureImageTaskSchema() {
  if (isPostgresMode) {
    await query(`
      CREATE TABLE IF NOT EXISTS image_generation_tasks (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'text-to-image',
        status TEXT NOT NULL DEFAULT 'pending',
        request_payload TEXT NOT NULL,
        result_payload TEXT NULL,
        error_message TEXT NULL,
        credits_cost INTEGER NOT NULL DEFAULT 0,
        draw_image_id INTEGER NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_image_generation_tasks_email ON image_generation_tasks(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_image_generation_tasks_status ON image_generation_tasks(status, created_at);`);
    await query(`
      CREATE OR REPLACE FUNCTION set_image_generation_tasks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await query(`DROP TRIGGER IF EXISTS set_image_generation_tasks_updated_at ON image_generation_tasks;`);
    await query(`
      CREATE TRIGGER set_image_generation_tasks_updated_at
      BEFORE UPDATE ON image_generation_tasks
      FOR EACH ROW EXECUTE FUNCTION set_image_generation_tasks_updated_at();
    `);
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS image_generation_tasks (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      task_type VARCHAR(50) NOT NULL DEFAULT 'text-to-image',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      request_payload LONGTEXT NOT NULL,
      result_payload LONGTEXT NULL,
      error_message TEXT NULL,
      credits_cost INT NOT NULL DEFAULT 0,
      draw_image_id INT NULL,
      attempts INT NOT NULL DEFAULT 0,
      locked_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_status_created_at (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
