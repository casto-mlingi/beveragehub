import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE role = 'manager'");
    console.log(res.rows);
  } catch (error) {
    console.error("Error fetching manager user details:", error);
  } finally {
    await pool.end();
  }
}

run();
