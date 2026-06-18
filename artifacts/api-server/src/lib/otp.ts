import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, otpTokensTable } from "@workspace/db";
import { eq, and, gt, count, isNull } from "drizzle-orm";
import { logger } from "./logger";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_5MIN = 3;
const RATE_LIMIT_1HR = 10;

function generateOtp(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

async function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    const nodemailer = await import("nodemailer");
    const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT ?? "587");
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }

  // No SMTP configured — use Ethereal test account (OTP goes to test inbox, URL logged server-side only)
  const nodemailer = await import("nodemailer");
  const testAccount = await nodemailer.createTestAccount();
  logger.warn(
    "No SMTP_USER/SMTP_PASS configured. Using Ethereal test email — OTP preview URL will appear in server logs.",
  );
  return {
    transport: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    isEthereal: true,
    nodemailer,
  };
}

async function checkRateLimit(email: string): Promise<void> {
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);
  const oneHrAgo = new Date(now - 60 * 60 * 1000);

  const [fiveMin] = await db
    .select({ c: count() })
    .from(otpTokensTable)
    .where(and(eq(otpTokensTable.email, email), gt(otpTokensTable.createdAt, fiveMinAgo)));

  if ((fiveMin?.c ?? 0) >= RATE_LIMIT_5MIN) {
    throw new Error("Too many OTP requests. Please wait 5 minutes before trying again.");
  }

  const [oneHr] = await db
    .select({ c: count() })
    .from(otpTokensTable)
    .where(and(eq(otpTokensTable.email, email), gt(otpTokensTable.createdAt, oneHrAgo)));

  if ((oneHr?.c ?? 0) >= RATE_LIMIT_1HR) {
    throw new Error("OTP hourly limit exceeded. Please try again later.");
  }
}

/**
 * Generate and send an OTP for the given email and purpose.
 * OTP is sent to email only — never returned to the caller or shown in the UI.
 * In development (no SMTP configured) an Ethereal test email is used and
 * the preview URL is printed to the server log.
 */
export async function sendOtp(email: string, purpose: string): Promise<void> {
  await checkRateLimit(email);

  await db.delete(otpTokensTable).where(
    and(eq(otpTokensTable.email, email), eq(otpTokensTable.purpose, purpose)),
  );

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await db.insert(otpTokensTable).values({ email, hashedOtp, purpose, attempts: 0, expiresAt });

  const result = await createTransporter();

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@pixelpeek.app";
  const subject =
    purpose === "forgot-password"
      ? "PixelPeek — Reset your password"
      : purpose === "register"
        ? "PixelPeek — Verify your email"
        : "PixelPeek — Your sign-in code";

  const actionText =
    purpose === "forgot-password"
      ? "reset your password"
      : purpose === "register"
        ? "verify your email and activate your account"
        : "complete your sign-in";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff">
      <div style="background:#FDE047;border:3px solid #0F172A;border-radius:16px;padding:8px 20px;display:inline-block;margin-bottom:24px">
        <span style="font-weight:900;font-size:14px;color:#0F172A">🔐 PixelPeek</span>
      </div>
      <h2 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#0F172A">Your verification code</h2>
      <p style="color:#64748b;margin:0 0 32px;font-size:15px">
        Use this code to ${actionText}. It expires in <strong>5 minutes</strong>.
      </p>
      <div style="background:#F8FAFC;border:3px solid #0F172A;border-radius:20px;padding:28px;text-align:center;margin-bottom:28px">
        <span style="font-size:52px;font-weight:900;letter-spacing:14px;color:#0F172A;font-family:monospace">${otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0">Never share this code with anyone. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  if ("isEthereal" in result && result.isEthereal) {
    const info = await result.transport.sendMail({ from, to: email, subject, html });
    const previewUrl = result.nodemailer.getTestMessageUrl(info);
    // OTP preview available in server logs ONLY — never shown in UI
    logger.info(
      { email, purpose, previewUrl },
      "OTP email sent via Ethereal (dev mode). View at the URL in this log entry. Configure SMTP_USER + SMTP_PASS for real email delivery.",
    );
  } else {
    await (result as ReturnType<typeof import("nodemailer").createTransport>).sendMail({
      from,
      to: email,
      subject,
      html,
    });
    logger.info({ email, purpose }, "OTP email sent");
  }
}

/**
 * Verify an OTP for the given email and purpose.
 * Throws with a descriptive message on failure.
 */
export async function verifyOtp(email: string, otp: string, purpose: string): Promise<void> {
  const [record] = await db
    .select()
    .from(otpTokensTable)
    .where(
      and(
        eq(otpTokensTable.email, email),
        eq(otpTokensTable.purpose, purpose),
        gt(otpTokensTable.expiresAt, new Date()),
        isNull(otpTokensTable.usedAt),
      ),
    );

  if (!record) {
    throw new Error("OTP expired or not found. Please request a new code.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new Error("Too many failed attempts. Please request a new OTP.");
  }

  const valid = await bcrypt.compare(otp, record.hashedOtp);

  if (!valid) {
    await db
      .update(otpTokensTable)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpTokensTable.id, record.id));
    const remaining = MAX_ATTEMPTS - record.attempts - 1;
    throw new Error(`Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
  }

  await db
    .update(otpTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(otpTokensTable.id, record.id));
}
