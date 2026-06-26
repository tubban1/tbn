const mysql = require('mysql2/promise');
const { createPool, ensureSupabaseSchema, loadLocalEnv } = require('./supabase_schema.cjs');

const tables = [
  {
    name: 'user_credits',
    key: ['email'],
    columns: ['email', 'password', 'credits', 'created_at', 'updated_at'],
  },
  {
    name: 'credit_transactions',
    key: ['id'],
    columns: ['id', 'email', 'type', 'amount', 'balance_after', 'description', 'stripe_payment_id', 'stripe_session_id', 'created_at'],
    sequence: ['credit_transactions', 'id'],
  },
  {
    name: 'draw_images',
    key: ['id'],
    columns: ['id', 'email', 'sketch_url', 'generated_url', 'display_url', 'style', 'prompt', 'prompt_en', 'prompt_zh', 'description', 'created_at'],
    sequence: ['draw_images', 'id'],
  },
  {
    name: 'temp_image_data',
    key: ['draw_image_id'],
    columns: ['draw_image_id', 'input_base64', 'output_base64', 'created_at'],
  },
  {
    name: 'diagnosis_sessions',
    key: ['id'],
    columns: ['id', 'email', 'status', 'completeness', 'profile_status', 'is_hidden', 'created_at', 'updated_at'],
  },
  {
    name: 'diagnosis_messages',
    key: ['id'],
    columns: ['id', 'session_id', 'sender', 'content', 'created_at'],
    sequence: ['diagnosis_messages', 'id'],
  },
  {
    name: 'diagnosis_profiles',
    key: ['session_id'],
    columns: ['session_id', 'known_facts', 'missing_fields', 'updated_at'],
    jsonColumns: ['known_facts', 'missing_fields'],
  },
  {
    name: 'diagnosis_reports',
    key: ['session_id'],
    columns: [
      'session_id',
      'summary',
      'maturity_score',
      'pain_points',
      'opportunity_map',
      'recommended_agents',
      'roadmap_30_60_90',
      'risks',
      'data_requirements',
      'next_actions',
      'created_at',
    ],
    jsonColumns: ['pain_points', 'opportunity_map', 'recommended_agents', 'roadmap_30_60_90', 'risks', 'data_requirements', 'next_actions'],
  },
];

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return process.env[name];
}

async function mysqlConnection() {
  return mysql.createConnection({
    host: requireEnv('MYSQL_HOST'),
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: requireEnv('MYSQL_USER'),
    password: requireEnv('MYSQL_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE'),
  });
}

async function mysqlTableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [process.env.MYSQL_DATABASE, tableName]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

function normalizeJson(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

function buildUpsertSql(table, rowCount) {
  const columns = table.columns;
  const placeholders = [];
  let parameterIndex = 1;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const rowPlaceholders = columns.map((column) => {
      const placeholder = `$${parameterIndex++}`;
      return table.jsonColumns?.includes(column) ? `${placeholder}::jsonb` : placeholder;
    });
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }

  const conflictTarget = table.key.join(', ');
  const updateColumns = columns.filter((column) => !table.key.includes(column));
  const updateClause = updateColumns.length
    ? `DO UPDATE SET ${updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}`
    : 'DO NOTHING';

  return `
    INSERT INTO ${table.name} (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (${conflictTarget}) ${updateClause}
  `;
}

async function resetSequence(pool, tableName, columnName) {
  await pool.query(
    `
    SELECT setval(
      pg_get_serial_sequence($1, $2),
      GREATEST((SELECT COALESCE(MAX(${columnName}), 1) FROM ${tableName}), 1),
      (SELECT COUNT(*) > 0 FROM ${tableName})
    )
    `,
    [tableName, columnName]
  );
}

async function migrateTable(mysqlDb, pgPool, table) {
  const exists = await mysqlTableExists(mysqlDb, table.name);
  if (!exists) {
    console.log(`- ${table.name}: skipped, source table does not exist`);
    return;
  }

  const [rows] = await mysqlDb.query(`SELECT ${table.columns.join(', ')} FROM ${table.name}`);
  if (!rows.length) {
    console.log(`- ${table.name}: no rows`);
    return;
  }

  console.log(`- ${table.name}: migrating ${rows.length} rows...`);
  const batchSize = parseInt(process.env.SUPABASE_MIGRATION_BATCH_SIZE || '200', 10);
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const upsertSql = buildUpsertSql(table, batch.length);
      const values = [];

      batch.forEach((row) => {
        table.columns.forEach((column) => {
          if (table.jsonColumns?.includes(column)) {
            values.push(normalizeJson(row[column]));
          } else {
            values.push(row[column] === undefined ? null : row[column]);
          }
        });
      });
      await client.query(upsertSql, values);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (table.sequence) {
    await resetSequence(pgPool, table.sequence[0], table.sequence[1]);
  }

  console.log(`- ${table.name}: migrated ${rows.length} rows`);
}

async function main() {
  loadLocalEnv();

  const mysqlDb = await mysqlConnection();
  const pgPool = createPool();

  try {
    console.log('Preparing Supabase schema...');
    await ensureSupabaseSchema(pgPool);

    console.log('Migrating data from MySQL to Supabase...');
    for (const table of tables) {
      await migrateTable(mysqlDb, pgPool, table);
    }

    console.log('Migration completed.');
  } finally {
    await mysqlDb.end();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
