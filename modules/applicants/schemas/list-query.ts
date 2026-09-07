import { z } from "zod";

const optionalInteger = (minimum: number, maximum: number) =>
  z.preprocess((value) => {
    if (typeof value === "number" && Number.isInteger(value)) {
      return value >= minimum && value <= maximum ? value : undefined;
    }
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      return undefined;
    }
    const number = Number(value);
    return number >= minimum && number <= maximum ? number : undefined;
  }, z.number().int().optional());

export const applicantListQuerySchema = z
  .object({
    gender: z.preprocess(
      (value) => (value === "M" || value === "F" ? value : undefined),
      z.enum(["M", "F"]).optional(),
    ),
    birthYear: optionalInteger(1900, 2200),
    status: z.preprocess(
      (value) =>
        value === "IN_ATTESA" || value === "DA_CHIAMARE" || value === "ACCETTATO" || value === "RIFIUTATO"
          ? value
          : undefined,
      z.enum(["IN_ATTESA", "DA_CHIAMARE", "ACCETTATO", "RIFIUTATO"]).optional(),
    ),
    query: z.preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined),
      z.string().optional(),
    ),
    page: z.preprocess((value) => {
      const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
      return typeof number === "number" && Number.isInteger(number) && number >= 1 ? number : 1;
    }, z.number().int().min(1)),
    pageSize: z.literal(20).default(20),
  })
  .transform(({ gender, birthYear, status, query, page, pageSize }) => ({
    ...(gender ? { gender } : {}),
    ...(birthYear ? { birthYear } : {}),
    ...(status ? { status } : {}),
    ...(query ? { query } : {}),
    page,
    pageSize,
  }));

export type ApplicantListQuery = z.output<typeof applicantListQuerySchema>;
