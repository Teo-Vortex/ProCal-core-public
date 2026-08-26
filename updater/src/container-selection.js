"use strict";

function containerNames(container) {
  return (Array.isArray(container?.Names) ? container.Names : [])
    .map((name) => String(name || "").replace(/^\//, ""));
}

function isRollbackContainer(container, rollbackContainerId = "") {
  if (rollbackContainerId && container?.Id === rollbackContainerId) return true;
  return containerNames(container).some((name) => /-rollback-\d+$/.test(name));
}

function selectCurrentTarget(containers, rollbackContainerId = "") {
  const rows = Array.isArray(containers) ? containers : [];
  return rows.filter((container) => !isRollbackContainer(container, rollbackContainerId));
}

module.exports = { isRollbackContainer, selectCurrentTarget };
