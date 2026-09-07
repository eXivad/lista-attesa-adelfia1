import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";

const SSL_QUERY_PARAMETERS = [
  "ssl",
  "sslcert",
  "sslkey",
  "sslmode",
  "sslrootcert",
  "uselibpqcompat",
] as const;

type PrismaPgAdapterOptions = {
  connectionString: string;
  max?: number;
  caCertificate?: string;
};

function normalizeCertificate(value: string): string {
  return value.replaceAll("\\n", "\n").trim();
}

export function buildPrismaPgPoolConfig({
  connectionString,
  max,
  caCertificate,
}: PrismaPgAdapterOptions): PoolConfig {
  const normalizedCertificate = caCertificate ? normalizeCertificate(caCertificate) : "";
  if (!normalizedCertificate) {
    return { connectionString, max };
  }

  // node-postgres lets SSL options in the URL override the explicit `ssl`
  // object. Remove them before supplying the trusted CA ourselves.
  const applicationUrl = new URL(connectionString);
  for (const parameter of SSL_QUERY_PARAMETERS) applicationUrl.searchParams.delete(parameter);

  return {
    connectionString: applicationUrl.toString(),
    max,
    ssl: {
      ca: normalizedCertificate,
      rejectUnauthorized: true,
    },
  };
}

export function createPrismaPgAdapter(options: PrismaPgAdapterOptions): PrismaPg {
  return new PrismaPg(buildPrismaPgPoolConfig(options));
}
