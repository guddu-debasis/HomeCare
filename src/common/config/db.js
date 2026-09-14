import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle ORM
export const db = drizzle(pool);

const connectDB = async () => {
  try {
    // Test the PostgreSQL connection
    const client = await pool.connect();
    console.log(`PostgreSQL Connected: ${client.connectionParameters.database}`);
    client.release(); // Release the client back to the pool
  } catch (err) {
    console.error(`Database connection error: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
