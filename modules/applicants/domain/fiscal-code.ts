const FISCAL_CODE_PATTERN = /^[A-Z0-9]{16}$/;

export function normalizeFiscalCode(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidFiscalCode(value: string): boolean {
  return FISCAL_CODE_PATTERN.test(normalizeFiscalCode(value));
}
