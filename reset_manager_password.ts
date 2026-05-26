import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function run() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    console.log("Updating manager password to hashed '123456'...");
    await pool.query("UPDATE users SET password = $1 WHERE uid = 'h9cpJbV4yTYw7JynoHvMvaBjpX33'", [hash]);
    console.log("Manager password updated successfully.");
  } catch (error) {
    console.error("Error updating manager password:", error);
  } finally {
    await pool.end();
  }
}

run();
