const REGISTRATION_NUMBER_LIMIT = 999_999;

export function getRegistrationYear(date = new Date()): number {
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Rome",
    year: "numeric",
  }).format(date);

  return Number(year);
}

export function formatRegistrationNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2_000 || year > 9_999) {
    throw new RangeError("Anno di iscrizione non valido.");
  }

  if (!Number.isInteger(sequence) || sequence < 1 || sequence > REGISTRATION_NUMBER_LIMIT) {
    throw new RangeError("Progressivo di iscrizione non valido.");
  }

  return `LA-${year}-${sequence.toString().padStart(6, "0")}`;
}
