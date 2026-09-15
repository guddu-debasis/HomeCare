import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

// Supabase pooler may use a different search_path — force public on every connection
pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

// Without this, an error on an idle pooled connection (e.g. the DB dropping
// it) becomes an unhandled 'error' event and can crash the process outside
// of any request/response cycle.
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client:", err);
});

export const db = drizzle(pool);

const connectDB = async () => {
  const client = await pool.connect();
  console.log(`PostgreSQL Connected: ${client.connectionParameters.database}`);
  client.release();
};

export default connectDB;

