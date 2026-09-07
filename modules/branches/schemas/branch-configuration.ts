import { z } from "zod";

import { BRANCHES } from "@/modules/branches/domain/branch";

const rowSchema = z.object({
  branch: z.enum(BRANCHES),
  minAge: z.coerce.number().int().min(0).max(30),
  maxAge: z.coerce.number().int().min(0).max(30),
  entryAge: z.coerce.number().int().min(0).max(30),
});

export const branchConfigurationsSchema = z.array(rowSchema).length(3).superRefine((rows, context) => {
  if (new Set(rows.map(({ branch }) => branch)).size !== 3) {
    context.addIssue({ code: "custom", message: "Configura una sola volta ciascuna branca." });
  }
  for (const [index, row] of rows.entries()) {
    if (row.minAge > row.maxAge || row.entryAge < row.minAge || row.entryAge > row.maxAge) {
      context.addIssue({
        code: "custom",
        path: [index, "entryAge"],
        message: "Età minima, massima e d'ingresso non sono coerenti.",
      });
    }
  }
  const ordered = [...rows].sort((a, b) => a.minAge - b.minAge);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].minAge <= ordered[index - 1].maxAge) {
      context.addIssue({ code: "custom", message: "Le fasce d'età delle branche non possono sovrapporsi." });
    }
  }
});

export type BranchConfigurationsInput = z.input<typeof branchConfigurationsSchema>;
