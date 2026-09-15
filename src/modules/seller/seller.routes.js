import Router from "express";
import validate from "../../common/middlewares/validate.middleware.js";
import * as controller from "./seller.controller.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import { verifyAuth, verifySeller } from "../../common/middlewares/auth.middleware.js";
import passport from "../../common/config/passport.js";
import { generateAccessToken, generateRefreshToken } from "../../common/utils/jwt.utils.js";
import crypto from "crypto";
import { db } from "../../common/config/db.js";
import { seller } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/",(req,res)=>{
    res.send("Seller route is working");
});
router.post("/register", validate(RegisterDto), controller.registerSeller);
router.post("/login", validate(LoginDto), controller.loginSeller);
router.post("/logout", verifyAuth, verifySeller, controller.logoutSeller);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.get("/bookings", verifyAuth, verifySeller, controller.fetchSellerBookings);
router.patch("/bookings/:id/status", verifyAuth, verifySeller, controller.updateSellerBookingStatus);
router.get("/notifications", verifyAuth, verifySeller, controller.fetchSellerNotifications);
// IMPORTANT: static segment "read-all" must be registered BEFORE the parameterized
// "/:id/read" route, otherwise Express treats "read-all" as the value of :id.
router.patch("/notifications/read-all", verifyAuth, verifySeller, controller.markAllSellerNotificationsRead);
router.patch("/notifications/:id/read", verifyAuth, verifySeller, controller.markSellerNotificationRead);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/auth/google",
  passport.authenticate("google-seller", { scope: ["profile", "email"], session: false })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google-seller", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    const { user, role } = req.user;
    const accessToken = generateAccessToken({ id: user.id, role });
    const refreshToken = generateRefreshToken({ id: user.id, role });
    const hashedRefreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await db.update(seller).set({ refreshToken: hashedRefreshToken }).where(eq(seller.id, user.id));

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