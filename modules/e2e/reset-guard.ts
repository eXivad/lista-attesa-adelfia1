interface E2EResetEnvironment {
  E2E_ALLOW_RESET?: string;
  DATABASE_URL?: string;
}

export function canResetE2EData(environment: E2EResetEnvironment) {
  if (environment.E2E_ALLOW_RESET !== "true" || !environment.DATABASE_URL) return false;

  try {
    const databaseUrl = new URL(environment.DATABASE_URL);
    const databaseName = decodeURIComponent(databaseUrl.pathname).replace(/^\/+/, "");
    const usesPostgreSql = databaseUrl.protocol === "postgresql:" || databaseUrl.protocol === "postgres:";
    return usesPostgreSql && /_(?:test|ci)$/.test(databaseName);
  } catch {
    return false;
  }
}
