import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("TABLES:", res.rows);
    
    const itemsRes = await pool.query("SELECT * FROM items LIMIT 2").catch(() => null);
    if (itemsRes) {
      console.log("ITEMS TABLE DATA:", itemsRes.rows);
    }
    
    const productsRes = await pool.query("SELECT * FROM products LIMIT 2").catch(() => null);
    if (productsRes) {
      console.log("PRODUCTS TABLE DATA:", productsRes.rows);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
