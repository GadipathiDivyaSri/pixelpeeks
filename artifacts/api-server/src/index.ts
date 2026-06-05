import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedDemoUser() {
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "demo@pixelpeek.app"));

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash("demo1234", 12);
      await db.insert(usersTable).values({
        name: "Demo User",
        email: "demo@pixelpeek.app",
        passwordHash,
      });
      logger.info("Demo user created");
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed demo user");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedDemoUser();
});
