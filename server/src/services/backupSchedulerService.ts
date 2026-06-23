import { logger } from "../utils/logger";
import { applyMaintenanceRetention, loadMaintenanceRetentionSettings, markMaintenanceCleanupRun } from "./maintenanceRetentionService";

let timer: NodeJS.Timeout | null = null;
let running = false;
let lastMaintenanceRunAtMs = 0;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    if (!lastMaintenanceRunAtMs || now.getTime() - lastMaintenanceRunAtMs >= 60 * 60 * 1000) {
      const retentionSettings = loadMaintenanceRetentionSettings();
      const cleanup = await applyMaintenanceRetention(retentionSettings);
      markMaintenanceCleanupRun(now);
      lastMaintenanceRunAtMs = now.getTime();
      if (cleanup.notificationsDeleted || cleanup.auditDeleted || cleanup.chatFilesDeleted) {
        logger.info({
          notificationsDeleted: cleanup.notificationsDeleted,
          auditDeleted: cleanup.auditDeleted,
          chatFilesDeleted: cleanup.chatFilesDeleted,
          chatFilesDeletedBytes: cleanup.chatFilesDeletedBytes
        }, "Maintenance retention cleanup applied");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Backup scheduler tick failed");
  } finally {
    running = false;
  }
}

export function startBackupScheduler(): void {
  if (timer) return;
  void tick();
  timer = setInterval(() => {
    void tick();
  }, 60 * 1000);
}

export function stopBackupScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
