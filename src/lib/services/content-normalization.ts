import "server-only";

export function normalizeContentText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findKeywordMatches(
  normalizedText: string,
  keywordRules: Array<{ id: string; normalizedPhrase: string; phrase: string }>,
) {
  return keywordRules.filter((rule) => normalizedText.includes(rule.normalizedPhrase));
}