export function tryGetValueByPath(source: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function getValueByPath(source: unknown, path: string): string {
  return tryGetValueByPath(source, path) ?? path;
}
