const updaterBaseUrl = String(process.env.PROCAL_UPDATER_URL || "").trim().replace(/\/+$/, "");
const updaterToken = String(process.env.PROCAL_UPDATER_TOKEN || "").trim();

export type SystemUpdateStatus = {
  enabled: boolean;
  reason?: string;
  currentVersion?: string;
  [key: string]: unknown;
};

function disabledStatus(): SystemUpdateStatus {
  return {
    enabled: false,
    reason: "updater_not_configured",
    currentVersion: String(process.env.PROCAL_APP_VERSION || "unknown")
  };
}

async function requestUpdater(pathname: string, method: "GET" | "POST"): Promise<SystemUpdateStatus> {
  if (!updaterBaseUrl || updaterToken.length < 32) return disabledStatus();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), method === "GET" ? 10_000 : 20_000);
  try {
    const response = await fetch(`${updaterBaseUrl}${pathname}`, {
      method,
      headers: { authorization: `Bearer ${updaterToken}`, accept: "application/json" },
      signal: controller.signal
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : `Updater request failed (${response.status})`;
      throw new Error(message);
    }
    return body as SystemUpdateStatus;
  } catch (error) {
    return {
      enabled: true,
      reachable: false,
      reason: "updater_unavailable",
      currentVersion: String(process.env.PROCAL_APP_VERSION || "unknown"),
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function getSystemUpdateStatus(): Promise<SystemUpdateStatus> {
  return requestUpdater("/v1/status", "GET");
}

export function checkForSystemUpdate(): Promise<SystemUpdateStatus> {
  return requestUpdater("/v1/check", "POST");
}

export function requestSystemUpdate(): Promise<SystemUpdateStatus> {
  return requestUpdater("/v1/update", "POST");
}

export function requestSystemRollback(): Promise<SystemUpdateStatus> {
  return requestUpdater("/v1/rollback", "POST");
}
