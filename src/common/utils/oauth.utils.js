import { OAuth2Client } from "google-auth-library";
import ApiError from "./api-error.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token (sent by the frontend after Google Identity
 * Services signs the user in) and returns the profile fields we care about.
 * Throws if the token is missing, expired, or wasn't issued for our client ID.
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) throw ApiError.badRequest("Missing Google ID token");

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    throw ApiError.badRequest("Invalid or expired Google sign-in token");
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw ApiError.badRequest("Google account has no email available");
  }
  if (!payload.email_verified) {
    throw ApiError.badRequest("Google email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
  };
};

/**
 * Exchanges a GitHub OAuth "code" (from the redirect callback) for an access
 * token, then fetches the user's profile and their primary verified email
 * (GitHub's /user endpoint omits email entirely when it's kept private).
 */
export const exchangeGithubCode = async (code) => {
  if (!code) throw ApiError.badRequest("Missing GitHub authorization code");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    throw ApiError.badRequest(
      tokenData.error_description || "Failed to exchange GitHub authorization code"
    );
  }

  const authHeader = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "HomeCare-App",
  };

  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers: authHeader }),
    fetch("https://api.github.com/user/emails", { headers: authHeader }),
  ]);

  if (!profileRes.ok) {
    throw ApiError.badRequest("Failed to fetch GitHub profile");
  }

  const profile = await profileRes.json();
  const emails = emailsRes.ok ? await emailsRes.json() : [];

  const primaryEmail =
    (Array.isArray(emails) && emails.find((e) => e.primary && e.verified)) ||
    (Array.isArray(emails) && emails.find((e) => e.verified));

  const email = primaryEmail?.email || profile.email;
  if (!email) {
    throw ApiError.badRequest(
      "Your GitHub account has no verified email available. Make an email address public or verified on GitHub and try again."
    );
  }

  return {
    githubId: String(profile.id),
    email,
    name: profile.name || profile.login,
  };
};
