/** Türkçe duyarsız metin araması için normalize */
export function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase("tr-TR").trim();
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return fields.some((f) => f != null && normalizeSearch(String(f)).includes(q));
}
