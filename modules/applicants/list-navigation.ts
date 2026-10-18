const filterKeys = ["query", "gender", "birthYear", "status", "page"];

export function listQueryFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): string {
  const source = typeof params.from === "string" ? new URLSearchParams(params.from) : null;
  const result = new URLSearchParams();
  for (const key of filterKeys) {
    const value = source?.get(key);
    if (value) result.set(key, value);
  }
  return result.toString();
}

export function listHref(query: string): string {
  return query ? `/lista-attesa?${query}` : "/lista-attesa";
}

export function detailHref(id: string, query: string, message?: string): string {
  const params = new URLSearchParams();
  if (query) params.set("from", query);
  if (message) params.set(message, "1");
  const suffix = params.toString();
  return `/iscritti/${id}${suffix ? `?${suffix}` : ""}`;
}
