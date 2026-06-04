require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  try {
    console.log('Checking columns in draw_images...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.columns 
      WHERE table_schema = ? AND table_name = 'draw_images'
    `, [process.env.MYSQL_DATABASE]);

    const columnNames = columns.map(c => c.COLUMN_NAME);

    if (!columnNames.includes('prompt_en')) {
      console.log('Adding prompt_en...');
      await connection.query('ALTER TABLE draw_images ADD COLUMN prompt_en TEXT NULL');
      // Migrate existing prompt to prompt_en
      await connection.query('UPDATE draw_images SET prompt_en = prompt WHERE prompt IS NOT NULL');
    }

    if (!columnNames.includes('prompt_zh')) {
      console.log('Adding prompt_zh...');
      await connection.query('ALTER TABLE draw_images ADD COLUMN prompt_zh TEXT NULL');
    }

    if (!columnNames.includes('description')) {
      console.log('Adding description...');
      await connection.query('ALTER TABLE draw_images ADD COLUMN description TEXT NULL');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
