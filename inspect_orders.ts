import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const usersRes = await pool.query("SELECT uid, email, role, company_id, name, phone FROM users");
    console.log("=== USERS ===");
    console.table(usersRes.rows);

    const ordersRes = await pool.query("SELECT id, company_id, customer_name, total_cost, timestamp, status FROM orders");
    console.log("=== ORDERS ===");
    console.table(ordersRes.rows);

    const productsRes = await pool.query("SELECT id, company_id, name, stock FROM products LIMIT 5");
    console.log("=== PRODUCTS (LIMIT 5) ===");
    console.table(productsRes.rows);

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
