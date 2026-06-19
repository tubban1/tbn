const mysql = require('serverless-mysql')({
  config: {
    host: 'mysql2.sqlpub.com',
    port: 3307,
    database: 'wish_2',
    user: 'root_2',
    password: 'CmC1dAVTwocDifNR'
  }
})

async function run() {
  try {
    const cols = await mysql.query('DESCRIBE draw_user');
    console.log("draw_user:", cols);
  } catch(e) {
    console.error(e);
  }
  await mysql.end();
}

run();
