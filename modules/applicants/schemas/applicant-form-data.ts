import type { ApplicantDataInput } from "./applicant-data";

export function applicantDataFromFormData(formData: FormData): ApplicantDataInput {
  return {
    minor: {
      firstName: text(formData, "minor.firstName"),
      lastName: text(formData, "minor.lastName"),
      gender: text(formData, "minor.gender") as "M" | "F",
      birthDate: text(formData, "minor.birthDate"),
      birthPlace: text(formData, "minor.birthPlace"),
      birthProvince: text(formData, "minor.birthProvince"),
      fiscalCode: text(formData, "minor.fiscalCode"),
      residenceAddress: text(formData, "minor.residenceAddress"),
      residenceCity: text(formData, "minor.residenceCity"),
      residenceProvince: text(formData, "minor.residenceProvince"),
      residencePostalCode: text(formData, "minor.residencePostalCode"),
      notes: text(formData, "minor.notes"),
    },
    guardians: (["A", "B"] as const).map((type) => ({
      type,
      firstName: text(formData, `guardian.${type}.firstName`),
      lastName: text(formData, `guardian.${type}.lastName`),
      birthDate: text(formData, `guardian.${type}.birthDate`),
      birthPlace: text(formData, `guardian.${type}.birthPlace`),
      birthProvince: text(formData, `guardian.${type}.birthProvince`),
      fiscalCode: text(formData, `guardian.${type}.fiscalCode`),
      address: text(formData, `guardian.${type}.address`),
      city: text(formData, `guardian.${type}.city`),
      province: text(formData, `guardian.${type}.province`),
      postalCode: text(formData, `guardian.${type}.postalCode`),
      email: text(formData, `guardian.${type}.email`),
      phone: text(formData, `guardian.${type}.phone`),
    })),
  };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
