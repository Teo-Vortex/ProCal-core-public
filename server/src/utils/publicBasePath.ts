function normalizeBasePath(rawValue: unknown): string {
  const raw = String(rawValue || "").trim();
  if (!raw || raw === "/") {
    return "";
  }
  const normalized = `/${raw.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "" : normalized;
}

export function getRequestBasePath(req: any): string {
  const direct = typeof req?.header === "function"
    ? req.header("x-procal-realm-base-path")
    : (req && req.headers ? req.headers["x-procal-realm-base-path"] : "");
  return normalizeBasePath(direct);
}

export function buildBasePathUrl(req: any, relativePath: string): string {
  const basePath = getRequestBasePath(req);
  const suffix = `/${String(relativePath || "").replace(/^\/+/, "")}`.replace(/\/+$/, (match) => match);
  return `${basePath}${suffix === "/" ? "" : suffix}` || "/";
}

export function buildCookiePath(req: any, suffix: string): string {
  const basePath = getRequestBasePath(req);
  const tail = `/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return `${basePath}${tail || "/"}` || "/";
}

export function getStorageScope(req: any, fallbackSlug: string): string {
  const basePath = getRequestBasePath(req);
  if (basePath) {
    return basePath.replace(/[^\w-]+/g, "_");
  }
  const slug = String(fallbackSlug || "").trim().toLowerCase();
  if (slug) {
    return slug.replace(/[^\w-]+/g, "_");
  }
  return "default";
}
