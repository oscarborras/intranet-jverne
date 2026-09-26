/** Lowercase and strip accents/diacritics: "José Núñez" -> "jose nunez". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Normalized words of a search query, split on spaces and commas. */
export function searchWords(query: string): string[] {
  return normalizeText(query).split(/[\s,]+/).filter(Boolean);
}

/** True when every query word appears somewhere in `haystack` (accent- and case-insensitive). */
export function matchesAllWords(haystack: string, words: string[]): boolean {
  if (words.length === 0) return true;
  const text = normalizeText(haystack);
  return words.every((w) => text.includes(w));
}
