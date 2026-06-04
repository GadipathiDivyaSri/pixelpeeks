import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  operation: text("operation").notNull(), // encode | decode | detect
  carrier: text("carrier").notNull(), // image | audio | video
  filename: text("filename").notNull(),
  verdict: text("verdict"), // CLEAN | SUSPECT | STEGO | null
  failed: boolean("failed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
