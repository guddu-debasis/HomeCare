import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import Admin from "./admin.model.js";
import crypto from "crypto";
import { sendEmail } from "../../common/utils/email.utils.js";
import bcrypt from "bcrypt";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ name, email, password, dateOfBirth }) => {
  const existing = await Admin.findOne({ email });
  if (existing) throw ApiError.conflict("Email already exisits");

  const { rawToken, hashedToken } = generateResetToken();
  
  password = await bcrypt.hash(password, 12);
  const user = await Admin.create({
    name,
    email,
    password,
    dateOfBirth,
    verificationToken: hashedToken,
  });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const login = async ({ email, password }) => {

  const user = await Admin.findOne({ email }).select("+password"); 
  if (!user) throw ApiError.unauthorized("Invalid Email or password");

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
  throw ApiError.unauthorized("Invalid email or password");
  }
   

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};


const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token);

  const user = await Admin.findById(decoded.id).select("+refreshToken");
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const logout = async (userId) => {


  await Admin.findByIdAndUpdate(userId, { refreshToken: null });
};

const forgotPassword = async (email) => {

  const user = await User.findOne({ email });

  if (!user) {
    throw ApiError.notfound("No account with that email");
  }


  // 1. Generate token
  const { rawToken, hashedToken } = generateResetToken();


  // 2. Save HASHED token in database
  user.resetPasswordToken = hashedToken;


  // 3. Token expires in 15 minutes
  user.resetPasswordExpires =
    new Date(Date.now() + 15 * 60 * 1000);


  await user.save();


  // 4. Create reset link
  const resetUrl =
    `${process.env.CLIENT_URL}/reset-password/${rawToken}`;


  // 5. Send email
  await sendEmail({
    to: user.email,

    subject: "Reset Your Password",

    html: `
      <h2>Password Reset Request</h2>

      <p>Hello ${user.name || "User"},</p>

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
