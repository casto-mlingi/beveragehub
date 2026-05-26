import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    console.table(res.rows);
  } catch (error) {
    console.error("Error inspecting orders table schema:", error);
  } finally {
    await pool.end();
  }
}

run();
