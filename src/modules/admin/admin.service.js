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
import {admin} from "../../db/schema.js";
import { db } from '../../common/config/db.js';
import { eq } from "drizzle-orm";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ username, email, password, dob, phNo }) => {
  const [existing] = await db.select().from(admin).where(eq(admin.email, email)).limit(1);
  if (existing) throw ApiError.conflict("Email already exisits");

  const { rawToken, hashedToken } = generateResetToken();
  
  password = await bcrypt.hash(password, 12);
  const [newAdmin] = await db.insert(admin).values({
    username,
    email,
    password,
    dob,
    phNo,
    verificationToken: hashedToken,
  }).returning();

  const userObj = {...newAdmin};
  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const login = async ({ email, password }) => {
  const [adminUser] = await db.select().from(admin).where(eq(admin.email, email)).limit(1);
  if (!adminUser) throw ApiError.unauthorized("Invalid Email or password");

  const isPasswordCorrect = await bcrypt.compare(password, adminUser.password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const accessToken = generateAccessToken({ id: adminUser.id, role: "admin" });
  const refreshToken = generateRefreshToken({ id: adminUser.id });

  const hashedRefreshToken = hashToken(refreshToken);
  
  await db.update(admin)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(admin.id, adminUser.id));

  const userObj = { ...adminUser };
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};


const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token);

  const [user] = await db.select().from(admin).where(eq(admin.id, decoded.id)).limit(1);
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "admin" });
  const refreshToken = generateRefreshToken({ id: user.id });

  const hashedRefreshToken = hashToken(refreshToken);
  await db.update(admin)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(admin.id, user.id));

  return { accessToken, refreshToken };
};

const logout = async (userId) => {

await db
    .update(admin)
    .set({ refreshToken: null })
    .where(eq(admin.id, userId));

};

const forgotPassword = async (email) => {
  const [user] = await db.select().from(admin).where(eq(admin.email, email)).limit(1);

  if (!user) {
    throw ApiError.notFound("No account with that email");
  }

  // 1. Generate token
  const { rawToken, hashedToken } = generateResetToken();

  // 2. Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // 3. Save HASHED token and expiry in database using Drizzle update
  await db
    .update(admin)
    .set({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    })
    .where(eq(admin.id, user.id));

  // 4. Create reset link
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  // 5. Send email
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
