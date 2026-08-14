import "dotenv/config";
import { createApp } from "./app";
import { getRuntimeConfig } from "./config/env";
import { logger } from "./utils/logger";
import { bootstrapDatabaseFromEnvIfNeeded } from "./setup/installer";
import { startBackupScheduler } from "./services/backupSchedulerService";
import { startEventReminderScheduler } from "./services/eventReminderSchedulerService";

async function start(): Promise<void> {
  await bootstrapDatabaseFromEnvIfNeeded();

  const runtime = getRuntimeConfig();
  const app = createApp();

  app.listen(runtime.port, () => {
    logger.info({ port: runtime.port }, "Server started");
    startBackupScheduler();
    startEventReminderScheduler();
  });
}

void start().catch((error) => {
  logger.fatal({ err: error }, "Database bootstrap failed; server will not start");
  process.exit(1);
});
