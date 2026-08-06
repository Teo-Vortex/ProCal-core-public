(function initHostedLinksModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getHostedPortalUrl(options) {
    const opts = options || {};
    const configured = String(opts.currentUserPublicPortalUrl || "").trim();
    if (configured) return configured;

    const runtimeConfigured = String(
      (root.PROCAL_RUNTIME && root.PROCAL_RUNTIME.publicPortalUrl) || ""
    ).trim();
    if (runtimeConfigured) return runtimeConfigured;

    const runtimeBasePath = String(
      (root.PROCAL_RUNTIME && root.PROCAL_RUNTIME.basePath) || ""
    ).trim();
    if (runtimeBasePath && root.location && root.location.origin) {
      return root.location.origin;
    }
    return "http://127.0.0.1:9088";
  }

  function getHostedPortalChooserUrl(options) {
    const portalUrl = String(getHostedPortalUrl(options) || "").trim();
    if (!portalUrl) return "";
    try {
      const nextUrl = new URL(portalUrl, root.location && root.location.href ? root.location.href : portalUrl);
      nextUrl.searchParams.set("portal", "1");
      return nextUrl.toString();
    } catch {
      return portalUrl;
    }
  }

  function updateProfilePasswordControls(options) {
    const opts = options || {};
    const manageHostedPasswordBtn = opts.manageHostedPasswordBtn;
    if (!manageHostedPasswordBtn) return;
    const showHostedButton = Boolean(opts.currentUserHostedIdentity && getHostedPortalUrl(options));
    manageHostedPasswordBtn.classList.toggle("hidden-section", !showHostedButton);
  }

  function openHostedPasswordPortal(options) {
    const portalUrl = getHostedPortalUrl(options);
    if (!portalUrl) return;
    root.open(portalUrl, "_blank", "noopener");
  }

  function getMobileAppDownloadUrl(options) {
    const runtimeConfigured = String(
      (root.PROCAL_RUNTIME && root.PROCAL_RUNTIME.mobileAppDownloadUrl) || ""
    ).trim();
    if (runtimeConfigured) {
      try {
        const resolved = new URL(runtimeConfigured, root.location && root.location.href ? root.location.href : undefined);
        return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : "";
      } catch {
        return "";
      }
    }

    const portalUrl = String(getHostedPortalUrl(options) || "").trim();
    if (!portalUrl) return "";
    try {
      return new URL("/downloads/procal.apk", portalUrl).toString();
    } catch {
      return "";
    }
  }

  function openMobileAppDownload(options) {
    const opts = options || {};
    const downloadUrl = getMobileAppDownloadUrl(options);
    const menuMsg = opts.menuMsg;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    if (!downloadUrl) {
      if (menuMsg) menuMsg.textContent = t("genericError");
      return;
    }
    const documentRef = opts.documentRef || root.document;
    if (!documentRef || !documentRef.body) return;
    const link = documentRef.createElement("a");
    link.href = downloadUrl;
    link.download = "procal.apk";
    link.rel = "noopener";
    link.target = "_blank";
    documentRef.body.appendChild(link);
    link.click();
    link.remove();
  }

  root.ProCalModules.appHostedLinks = {
    getHostedPortalUrl,
    getHostedPortalChooserUrl,
    updateProfilePasswordControls,
    openHostedPasswordPortal,
    getMobileAppDownloadUrl,
    openMobileAppDownload
  };
})(window);
