import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`PostgreSQL Connected: ${client.connectionParameters.database}`);
    client.release();
  } catch (err) {
    console.error("Database connection error details:", err);
    process.exit(1);
  }
};

export default connectDB;