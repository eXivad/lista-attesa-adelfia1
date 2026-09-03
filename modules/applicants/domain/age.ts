const MS_PER_DAY = 24 * 60 * 60 * 1_000;

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function calculateAge(birthDate: Date, referenceDate = new Date()): number {
  if (!isValidDate(birthDate) || !isValidDate(referenceDate)) {
    throw new TypeError("La data fornita non è valida.");
  }

  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const referenceMonth = referenceDate.getUTCMonth();
  const birthMonth = birthDate.getUTCMonth();
  const birthdayHasNotOccurred =
    referenceMonth < birthMonth ||
    (referenceMonth === birthMonth && referenceDate.getUTCDate() < birthDate.getUTCDate());

  if (birthdayHasNotOccurred) {
    age -= 1;
  }

  return age;
}

export function isEligibleAge(birthDate: Date, referenceDate = new Date()): boolean {
  if (!isValidDate(birthDate) || !isValidDate(referenceDate)) {
    return false;
  }

  const endOfBirthDay = new Date(birthDate.getTime() + MS_PER_DAY - 1);
  if (endOfBirthDay.getTime() < birthDate.getTime() || birthDate.getTime() > referenceDate.getTime()) {
    return false;
  }

  const age = calculateAge(birthDate, referenceDate);
  return age >= 0 && age <= 21;
}
