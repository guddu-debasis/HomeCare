import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db.js";
import { customers, seller } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Render sets RENDER_EXTERNAL_URL automatically in production
const BASE_URL =
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

// ─── Customer Strategy ───────────────────────────────────────────────────────
passport.use(
  "google-customer",
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/app/v1/customer/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email returned from Google"));

        let [user] = await db
          .select()
          .from(customers)
          .where(eq(customers.email, email))
          .limit(1);

        if (!user) {
          // New customer via Google — generate a random unusable password
          const hashedPassword = await bcrypt.hash(
            crypto.randomBytes(24).toString("hex"),
            12
          );
          [user] = await db
            .insert(customers)
            .values({
              username: profile.displayName || email.split("@")[0],
              email,
              password: hashedPassword,
            })
            .returning();
        }

        return done(null, { user, role: "customer" });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ─── Seller Strategy ─────────────────────────────────────────────────────────
passport.use(
  "google-seller",
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/app/v1/seller/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email returned from Google"));

        let [user] = await db
          .select()
          .from(seller)
          .where(eq(seller.email, email))
          .limit(1);

        if (!user) {
          const hashedPassword = await bcrypt.hash(
            crypto.randomBytes(24).toString("hex"),
            12
          );
          [user] = await db
            .insert(seller)
            .values({
              username: profile.displayName || email.split("@")[0],
              email,
              password: hashedPassword,
            })
            .returning();
        }

        return done(null, { user, role: "seller" });
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
