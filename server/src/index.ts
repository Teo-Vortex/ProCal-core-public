import "dotenv/config";
import { createApp } from "./app";
import { getRuntimeConfig } from "./config/env";
import { logger } from "./utils/logger";
import { bootstrapDatabaseFromEnvIfNeeded, migrateSchemaIfConfigured } from "./setup/installer";
import { startBackupScheduler } from "./services/backupSchedulerService";
import { startEventReminderScheduler } from "./services/eventReminderSchedulerService";

async function start(): Promise<void> {
  try {
    await bootstrapDatabaseFromEnvIfNeeded();
    migrateSchemaIfConfigured();
  } catch (error) {
    logger.error({ err: error }, "Database bootstrap from env failed");
  }

  const runtime = getRuntimeConfig();
  const app = createApp();

  app.listen(runtime.port, () => {
    logger.info({ port: runtime.port }, "Server started");
    startBackupScheduler();
    startEventReminderScheduler();
  });
}

void start();
