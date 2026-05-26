import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("Altering orders table to add customer_phone column...");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT");
    console.log("Column customer_phone added/verified successfully.");
  } catch (error) {
    console.error("Error altering orders table:", error);
  } finally {
    await pool.end();
  }
}

run();
