import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import crypto from "crypto";
import { sendEmail } from "../../common/utils/email.utils.js";
import bcrypt from "bcrypt";
import { seller } from "../../db/schema.js";
import { db } from "../../common/config/db.js";
import { eq } from "drizzle-orm";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ username, email, password, dob, phNo }) => {
  const [existing] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);
  if (existing) throw ApiError.conflict("Email already exists");

  const { hashedToken } = generateResetToken();
  const hashedPassword = await bcrypt.hash(password, 12);

  const [newSeller] = await db
    .insert(seller)
    .values({
      username,
      email,
      password: hashedPassword,
      dob: dob || null,
      phNo: phNo || null,
      verificationToken: hashedToken,
    })
    .returning();

  const userObj = { ...newSeller };
  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const login = async ({ email, password }) => {
  const [user] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);
  if (!user) throw ApiError.unauthorized("Invalid Email or password");

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "seller" });
  const refreshToken = generateRefreshToken({ id: user.id });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(seller)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(seller.id, user.id));

  const userObj = { ...user };
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token);

  const [user] = await db.select().from(seller).where(eq(seller.id, decoded.id)).limit(1);
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = generateRefreshToken({ id: user.id });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(seller)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(seller.id, user.id));

  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await db
    .update(seller)
    .set({ refreshToken: null })
    .where(eq(seller.id, userId));

  return { message: "Logged out successfully" };
};

const forgotPassword = async (email) => {
  const [user] = await db.select().from(seller).where(eq(seller.email, email)).limit(1);

  if (!user) {
    throw ApiError.notfound("No account with that email");
  }

  const { rawToken, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db
    .update(seller)
    .set({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    })
    .where(eq(seller.id, user.id));

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html: `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.username || "User"},</p>
      <p>
        We received a request to reset your password.
      </p>
      <p>
        Click the link below to reset your password:
      </p>
      <a href="${resetUrl}">
        Reset Password
      </a>
      <p>
        This link will expire in <strong>15 minutes</strong>.
      </p>
      <p>
        If you did not request a password reset,
        please ignore this email.
      </p>
    `,
  });

  return {
    message: "Password reset link sent successfully",
  };
};

export { register, login, refresh, logout, forgotPassword };