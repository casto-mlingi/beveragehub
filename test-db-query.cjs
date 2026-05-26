const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://admin:Paris09051996@45.88.188.129:5860/beverage' });

async function run() {
  try {
    const res = await pool.query('SELECT * FROM products LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
