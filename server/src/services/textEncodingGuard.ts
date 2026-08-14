type EncodingCorruptionFinding = {
  path: string;
  reason: "unicode_replaced" | "new_damaged_text";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectStrings(value: unknown, path: string, out: Map<string, string>): void {
  if (typeof value === "string") {
    out.set(path, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out));
    return;
  }
  if (!isRecord(value)) return;
  Object.entries(value).forEach(([key, item]) => {
    const childPath = path ? `${path}.${key}` : key;
    collectStrings(item, childPath, out);
  });
}

function looksLikeUnicodeReplacement(previous: string, next: string): boolean {
  if (previous === next) return false;
  const before = Array.from(previous);
  const after = Array.from(next);
  if (before.length !== after.length) return false;

  let replacedUnicodeCharacters = 0;
  for (let index = 0; index < before.length; index += 1) {
    const oldCharacter = before[index];
    const newCharacter = after[index];
    if (oldCharacter === newCharacter) continue;
    if (oldCharacter.codePointAt(0)! > 0x7f && (newCharacter === "?" || newCharacter === "\ufffd")) {
      replacedUnicodeCharacters += 1;
      continue;
    }
    return false;
  }
  return replacedUnicodeCharacters >= 2;
}

function looksLikeDamagedText(value: string): boolean {
  if (value.includes("\ufffd")) return true;
  const mojibakeMarkers = Array.from(value).filter((character) => /[\u00c2\u00c3\u00d0\u00d1]/u.test(character)).length;
  if (mojibakeMarkers >= 2) return true;

  const visibleCharacters = Array.from(value).filter((character) => !/\s/u.test(character));
  if (visibleCharacters.length < 2) return false;
  const questionMarks = visibleCharacters.filter((character) => character === "?").length;
  return questionMarks >= 2 && questionMarks / visibleCharacters.length >= 0.75;
}

function countDamagedStrings(strings: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of strings) {
    if (!looksLikeDamagedText(value)) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

export function findNewTextEncodingCorruption(previous: unknown, next: unknown): EncodingCorruptionFinding | null {
  const previousStrings = new Map<string, string>();
  const nextStrings = new Map<string, string>();
  collectStrings(previous, "", previousStrings);
  collectStrings(next, "", nextStrings);

  for (const [path, nextValue] of nextStrings) {
    const previousValue = previousStrings.get(path);
    if (previousValue != null && looksLikeUnicodeReplacement(previousValue, nextValue)) {
      return { path, reason: "unicode_replaced" };
    }
  }

  const previousDamagedCounts = countDamagedStrings(previousStrings.values());
  const nextDamagedCounts = countDamagedStrings(nextStrings.values());
  for (const [value, nextCount] of nextDamagedCounts) {
    if (nextCount > (previousDamagedCounts.get(value) || 0)) {
      const path = Array.from(nextStrings.entries()).find(([, candidate]) => candidate === value)?.[0] || "state";
      return { path, reason: "new_damaged_text" };
    }
  }

  return null;
}
