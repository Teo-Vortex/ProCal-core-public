"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function parseImageReference(value) {
  const raw = String(value || "").trim().replace(/^docker:\/\//, "");
  const at = raw.lastIndexOf("@");
  if (at > 0) return { repository: raw.slice(0, at).toLowerCase(), tag: raw.slice(at + 1), digest: true };
  const slash = raw.lastIndexOf("/");
  const colon = raw.lastIndexOf(":");
  if (colon > slash) return { repository: raw.slice(0, colon).toLowerCase(), tag: raw.slice(colon + 1), digest: false };
  return { repository: raw.toLowerCase(), tag: "latest", digest: false };
}

test("parses tagged GHCR references", () => {
  assert.deepEqual(parseImageReference("ghcr.io/Teo-Vortex/ProCal-Core-Public:v1.2.3"), {
    repository: "ghcr.io/teo-vortex/procal-core-public",
    tag: "v1.2.3",
    digest: false
  });
});

test("defaults an untagged image to latest", () => {
  assert.equal(parseImageReference("ghcr.io/teo-vortex/procal-core-public").tag, "latest");
});
