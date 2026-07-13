import crypto from 'crypto';
import { isPostgresMode, query } from './db';

const SCRYPT_KEY_LENGTH = 64;
let tbnUserTablesReady = false;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  if (!storedHash.startsWith('scrypt$')) {
    return storedHash === password;
  }

  const [, salt, expectedHex] = storedHash.split('$');
  if (!salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export async function ensureTbnUserTables() {
  if (tbnUserTablesReady) return;

  if (isPostgresMode) {
    await query(`
      CREATE TABLE IF NOT EXISTS tbn_user_credits (
        email TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      INSERT INTO tbn_user_credits (email, password_hash, credits, created_at, updated_at)
      SELECT email, password, credits, created_at, updated_at
      FROM user_credits
      WHERE NOT EXISTS (
        SELECT 1 FROM tbn_user_credits t WHERE t.email = user_credits.email
      );
    `).catch((error) => {
      console.warn('[TBN User] Legacy user_credits migration skipped:', error.message);
    });

    await query(`
      CREATE OR REPLACE FUNCTION set_tbn_user_credits_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await query(`DROP TRIGGER IF EXISTS set_tbn_user_credits_updated_at ON tbn_user_credits;`);
    await query(`
      CREATE TRIGGER set_tbn_user_credits_updated_at
      BEFORE UPDATE ON tbn_user_credits
      FOR EACH ROW EXECUTE FUNCTION set_tbn_user_credits_updated_at();
    `);
    tbnUserTablesReady = true;
    return;
  }

  await query(`CREATE TABLE IF NOT EXISTS tbn_user_credits (
    email VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await query(`
    INSERT IGNORE INTO tbn_user_credits (email, password_hash, credits, created_at, updated_at)
    SELECT email, password, credits, created_at, updated_at FROM user_credits;
  `).catch((error) => {
    console.warn('[TBN User] Legacy user_credits migration skipped:', error.message);
  });
  tbnUserTablesReady = true;
}

export async function getTbnUser(email) {
  const rows = await query('SELECT email, password_hash, credits FROM tbn_user_credits WHERE email = ? LIMIT 1', [email]);
  return rows?.[0] || null;
}

export async function validateTbnUser(email, password) {
  if (!email || !password) return null;
  await ensureTbnUserTables();
  const user = await getTbnUser(email);
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return user;
}

export async function createTbnUser(email, password, credits = 30) {
  await ensureTbnUserTables();
  const passwordHash = hashPassword(password);
  await query('INSERT INTO tbn_user_credits (email, password_hash, credits) VALUES (?, ?, ?)', [email, passwordHash, credits]);
  return { email, password_hash: passwordHash, credits };
}
