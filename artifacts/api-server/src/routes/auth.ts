import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  GetMeResponse,
  ForgotPasswordBody,
  ResetPasswordBody,
  SendOtpBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { sendOtp, verifyOtp } from "../lib/otp";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const PENDING_JWT_SECRET = (process.env.SESSION_SECRET ?? "dev-secret-change-me") + "-pending";

function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

function signPendingToken(email: string): string {
  return jwt.sign({ email, pending: true }, PENDING_JWT_SECRET, { expiresIn: "10m" });
}

function userToProfile(user: { id: number; name: string; email: string; createdAt: Date }) {
  return GetMeResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  });
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email: normalizedEmail, passwordHash })
    .returning();

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User registered");
  res.status(201).json({ token, user: userToProfile(user) });
});

// POST /auth/login — returns requiresOtp:true when credentials are valid (2FA required)
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  try {
    const { devOtp } = await sendOtp(normalizedEmail, "login");
    const pendingToken = signPendingToken(normalizedEmail);
    logger.info({ userId: user.id }, "Login OTP sent");
    res.json({ requiresOtp: true, pendingToken, ...(devOtp ? { devOtp } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send OTP.";
    res.status(429).json({ error: msg });
  }
});

// POST /auth/send-otp — resend OTP (used by the verify page for resend)
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { email, purpose } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (purpose === "login") {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));
    if (!user) {
      res.json({ message: "If that account exists, an OTP has been sent." });
      return;
    }
  }

  try {
    const { devOtp } = await sendOtp(normalizedEmail, purpose);
    res.json({ message: "OTP sent.", ...(devOtp ? { devOtp } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send OTP.";
    res.status(429).json({ error: msg });
  }
});

// POST /auth/verify-otp — verify code and return full auth token or reset token
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { email, otp, purpose, pendingToken } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (purpose === "login" && pendingToken) {
    try {
      const payload = jwt.verify(pendingToken, PENDING_JWT_SECRET) as { email: string; pending: boolean };
      if (payload.email !== normalizedEmail || !payload.pending) {
        res.status(401).json({ error: "Invalid session. Please log in again." });
        return;
      }
    } catch {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }
  }

  try {
    await verifyOtp(normalizedEmail, otp, purpose);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed.";
    res.status(400).json({ error: msg });
    return;
  }

  if (purpose === "login") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const token = signToken(user.id);
    logger.info({ userId: user.id }, "User logged in (OTP verified)");
    res.json({ token, user: userToProfile(user) });
    return;
  }

  if (purpose === "forgot-password") {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, user.id));
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(passwordResetTokensTable).values({ userId: user.id, token: resetToken, expiresAt });
    logger.info({ userId: user.id }, "Password reset token issued via OTP");
    res.json({ resetToken });
    return;
  }

  res.status(400).json({ error: "Unknown OTP purpose." });
});

// POST /auth/forgot-password — sends OTP via email
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    res.json({ message: "If that account exists, a verification code has been sent to your email." });
    return;
  }

  try {
    const { devOtp } = await sendOtp(normalizedEmail, "forgot-password");
    res.json({ message: "A verification code has been sent to your email.", ...(devOtp ? { devOtp } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send OTP.";
    res.status(429).json({ error: msg });
  }
});

// POST /auth/reset-password
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { token, password } = parsed.data;

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );

  if (!record) {
    res.status(400).json({ error: "This reset link is invalid or has expired." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, record.userId));
  await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, record.id));

  logger.info({ userId: record.userId }, "Password reset successful");
  res.json({ message: "Password updated successfully." });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = (jwt.verify(token, JWT_SECRET) as unknown) as { sub: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(payload.sub)));
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    res.json(userToProfile(user));
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

export default router;
