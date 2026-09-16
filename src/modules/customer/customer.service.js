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
import { customers, notifications } from "../../db/schema.js";
import { db } from "../../common/config/db.js";
import { eq, and, desc } from "drizzle-orm";
import { redis } from "../../common/config/redis.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ username, email, password, dob, phNo }) => {
  const [existing] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  if (existing) throw ApiError.conflict("Email already exists");

  const { hashedToken } = generateResetToken();
  const hashedPassword = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(customers)
    .values({
      username,
      email,
      password: hashedPassword,
      dob: dob || null,
      phNo: phNo || null,
      verificationToken: hashedToken,
    })
    .returning();

  const userObj = { ...newUser };
  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const login = async ({ email, password }) => {
  const [user] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  if (!user) throw ApiError.unauthorized("Invalid Email or password");

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "customer" });
  const refreshToken = generateRefreshToken({ id: user.id, role: "customer" });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(customers)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(customers.id, user.id));

  const userObj = { ...user };
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token);

  if (decoded.role !== "customer") {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const [user] = await db.select().from(customers).where(eq(customers.id, decoded.id)).limit(1);
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user.id, role: "customer" });
  const refreshToken = generateRefreshToken({ id: user.id, role: "customer" });

  const hashedRefreshToken = hashToken(refreshToken);
  await db
    .update(customers)
    .set({ refreshToken: hashedRefreshToken })
    .where(eq(customers.id, user.id));

  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await db
    .update(customers)
    .set({ refreshToken: null })
    .where(eq(customers.id, userId));
    
  return { message: "Logged out successfully" };
};

const forgotPassword = async (email) => {
  const [user] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

  if (!user) {
    throw ApiError.notFound("No account with that email");
  }

  const { rawToken, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db
    .update(customers)
    .set({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    })
    .where(eq(customers.id, user.id));

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

const resetPassword = async (token, newPassword) => {
  if (!token) throw ApiError.badRequest("Reset token is required");
  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest("Password must be at least 8 characters");
  }

  const hashedToken = hashToken(token);
  const [user] = await db
    .select()
    .from(customers)
    .where(eq(customers.resetPasswordToken, hashedToken))
    .limit(1);

  if (!user) {
    throw ApiError.badRequest("Invalid or expired password reset link");
  }

  if (new Date() > new Date(user.resetPasswordExpires)) {
    throw ApiError.badRequest("Password reset link has expired. Please request a new one.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db
    .update(customers)
    .set({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      refreshToken: null,
    })
    .where(eq(customers.id, user.id));

  return { message: "Password reset successfully. You can now log in with your new password." };
};

const getCustomerNotifications = async (customerId) => {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.customerId, Number(customerId)))
    .orderBy(desc(notifications.createdAt));
};

const UNREAD_TTL = 60 * 60;

// New: cheap, Redis-backed. This is what the 20s poll should call instead of
// getCustomerNotifications above.
const getUnreadCount = async (customerId) => {
  const cacheKey = `unread:customer:${customerId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return Number(cached);
  }

  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.customerId, Number(customerId)), eq(notifications.isRead, false)));
  const count = rows.length;

  await redis.set(cacheKey, count, { ex: UNREAD_TTL });
  return count;
};

const markNotificationRead = async (customerId, notificationId) => {
  // Check prior state first so we only decrement Redis when this notification
  // actually flips from unread → read (keeps the counter accurate even if the
  // same notification is clicked twice).
  const [existing] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, Number(notificationId)),
        eq(notifications.customerId, Number(customerId))
      )
    )
    .limit(1);

  if (!existing) {
    throw ApiError.notFound("Notification not found");
  }

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, Number(notificationId)))
    .returning();

  if (!existing.isRead) {
    await redis.decr(`unread:customer:${customerId}`);
  }

  return updated;
};

const markAllNotificationsRead = async (customerId) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.customerId, Number(customerId)));

  await redis.set(`unread:customer:${customerId}`, 0);

  return { message: "All notifications marked as read" };
};

export {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getCustomerNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};