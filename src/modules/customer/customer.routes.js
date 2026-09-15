import { Router } from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import controller from "./customer.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifyCustomer } from "../../common/middlewares/auth.middleware.js";
import passport from "../../common/config/passport.js";
import { generateAccessToken, generateRefreshToken } from "../../common/utils/jwt.utils.js";
import crypto from "crypto";
import { db } from "../../common/config/db.js";
import { customers } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const router=Router();

router.get("/",(req,res)=>{
    res.send("Customer route is working");
});
router.post("/register", validate(RegisterDto), controller.registerCustomer);
router.post("/login", validate(LoginDto), controller.loginCustomer);
router.post("/logout", verifyAuth, verifyCustomer, controller.logoutCustomer);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/notifications", verifyAuth, verifyCustomer, controller.fetchCustomerNotifications);
// IMPORTANT: static segment "read-all" must be registered BEFORE the parameterized
// "/:id/read" route, otherwise Express treats "read-all" as the value of :id.
router.patch("/notifications/read-all", verifyAuth, verifyCustomer, controller.markAllCustomerNotificationsRead);
router.patch("/notifications/:id/read", verifyAuth, verifyCustomer, controller.markCustomerNotificationRead);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/auth/google",
  passport.authenticate("google-customer", { scope: ["profile", "email"], session: false })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google-customer", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    const { user, role } = req.user;
    const accessToken = generateAccessToken({ id: user.id, role });
    const refreshToken = generateRefreshToken({ id: user.id, role });
    const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await db.update(customers).set({ refreshToken: hashedRefreshToken }).where(eq(customers.id, user.id));

    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.refreshToken;
    delete safeUser.verificationToken;

    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      role,
      user: JSON.stringify(safeUser),
    });
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?${params.toString()}`);
  }
);

export default router;