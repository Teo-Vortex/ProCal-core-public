"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isRollbackContainer, selectCurrentTarget } = require("../src/container-selection");

test("keeps the current app and ignores a running named rollback container", () => {
  const current = { Id: "current", Names: ["/enthusiastic_erik-app-1"] };
  const rollback = { Id: "old", Names: ["/enthusiastic_erik-app-1-rollback-1786723586115"] };

  assert.deepEqual(selectCurrentTarget([current, rollback]), [current]);
});

test("ignores the rollback container recorded in state even without a rollback name", () => {
  const current = { Id: "current", Names: ["/procal-core-app-1"] };
  const rollback = { Id: "old", Names: ["/legacy-app-copy"] };

  assert.deepEqual(selectCurrentTarget([current, rollback], "old"), [current]);
});

test("does not hide ordinary app containers with similar names", () => {
  const current = { Id: "current", Names: ["/procal-core-app-1"] };
  const other = { Id: "other", Names: ["/procal-core-app-1-rollback-preview"] };

  assert.equal(isRollbackContainer(other), false);
  assert.deepEqual(selectCurrentTarget([current, other]), [current, other]);
});
