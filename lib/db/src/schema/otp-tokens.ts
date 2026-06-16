import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otpTokensTable = pgTable("otp_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  hashedOtp: text("hashed_otp").notNull(),
  purpose: text("purpose").notNull(), // login | forgot-password
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOtpTokenSchema = createInsertSchema(otpTokensTable).omit({ id: true, createdAt: true });
export type InsertOtpToken = z.infer<typeof insertOtpTokenSchema>;
export type OtpToken = typeof otpTokensTable.$inferSelect;
