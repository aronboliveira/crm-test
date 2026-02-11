type CssModuleClassMap = Readonly<Record<string, string>>;

const TOKEN_SEPARATOR = "|";

export const createCssModuleClassMemo = (
  styles: CssModuleClassMap,
): ((tokens: readonly string[]) => string) => {
  const cache = new Map<string, string>();

  return (tokens: readonly string[]): string => {
    const key = tokens.join(TOKEN_SEPARATOR);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const next = tokens
      .map((token) => styles[token] ?? "")
      .filter(Boolean)
      .join(" ");

    cache.set(key, next);
    return next;
  };
};
