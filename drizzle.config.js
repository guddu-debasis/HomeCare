import dotenv from "dotenv";

dotenv.config({
  path: ".env",
});

export default {
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // IMPORTANT: migrations must run over a direct/session connection, NOT
    // the transaction-mode pooler (port 6543) that DATABASE_URL points at
    // for the running app. Transaction-mode pooling doesn't keep a stable
    // session, which migration tools need to reliably run DDL and record it
    // in their tracking table — through it, drizzle-kit migrate can silently
    // no-op instead of erroring, which is exactly what happened here.
    // Falls back to DATABASE_URL only so `generate` (which needs no real
    // connection) doesn't hard-fail if DIRECT_DATABASE_URL isn't set yet —
    // but `migrate` specifically REQUIRES DIRECT_DATABASE_URL to be set to
    // Supabase's direct or session-mode (port 5432) connection string.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
};

