import "server-only";

import { getPrismaClient } from "@/lib/server/prisma";
import { AssociativeYearService } from "@/modules/years/services/associative-year.service";
import { PrismaAssociativeYearRepository } from "@/repositories/prisma/associative-year.repository";

export function getAssociativeYearRepository() {
  return new PrismaAssociativeYearRepository(getPrismaClient());
}

export function getAssociativeYearService() {
  return new AssociativeYearService({ repository: getAssociativeYearRepository() });
}
