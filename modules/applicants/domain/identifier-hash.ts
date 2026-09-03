import { createHmac } from "node:crypto";

import { normalizeFiscalCode } from "./fiscal-code";

export function hashFiscalCode(value: string, secret: string): string {
  return createHmac("sha256", secret).update(normalizeFiscalCode(value)).digest("hex");
}
