export type WeightedInputSuggestion = Readonly<{
  value: string;
  score: number;
}>;

const normalizeToken = (value: string): string =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default class ImportInputSuggestionService {
  static toFieldMap(
    items: ReadonlyArray<
      Readonly<{ field: string; suggestions: readonly WeightedInputSuggestion[] }>
    >,
  ): Readonly<Record<string, readonly WeightedInputSuggestion[]>> {
    return items.reduce<Record<string, readonly WeightedInputSuggestion[]>>(
      (acc, item) => {
        const field = String(item.field ?? "").trim();
        if (!field) return acc;
        acc[field] = Array.isArray(item.suggestions) ? item.suggestions : [];
        return acc;
      },
      {},
    );
  }

  static rankValues(
    suggestions: readonly WeightedInputSuggestion[],
    rawQuery: string,
    limit = 5,
  ): string[] {
    const query = normalizeToken(rawQuery || "");
    const safeLimit = Math.max(1, Math.min(5, Math.floor(limit || 5)));

    return suggestions
      .map((entry) => {
        const value = String(entry.value ?? "").trim();
        if (!value) return null;
        const normalizedValue = normalizeToken(value);
        if (query && !normalizedValue.includes(query)) return null;

        const baseScore = Number.isFinite(entry.score) ? entry.score : 0;
        const queryBoost = !query ? 0 : normalizedValue.startsWith(query) ? 180 : 90;
        return {
          value,
          score: baseScore + queryBoost,
        };
      })
      .filter((entry): entry is { value: string; score: number } => Boolean(entry))
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.value.localeCompare(right.value, "pt-BR");
      })
      .slice(0, safeLimit)
      .map((entry) => entry.value);
  }
}
