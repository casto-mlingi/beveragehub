import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const managerId = 'h9cpJbV4yTYw7JynoHvMvaBjpX33';

    console.log("Updating products company_id...");
    const productsRes = await pool.query(
      "UPDATE products SET company_id = $1 WHERE company_id != $1 OR company_id IS NULL RETURNING id, name, company_id",
      [managerId]
    );
    console.log(`Updated ${productsRes.rowCount} products:`);
    console.table(productsRes.rows);

    console.log("Updating orders company_id...");
    const ordersRes = await pool.query(
      "UPDATE orders SET company_id = $1 WHERE company_id != $1 OR company_id IS NULL RETURNING id, customer_name, company_id",
      [managerId]
    );
    console.log(`Updated ${ordersRes.rowCount} orders:`);
    console.table(ordersRes.rows);

  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    await pool.end();
  }
}

run();
