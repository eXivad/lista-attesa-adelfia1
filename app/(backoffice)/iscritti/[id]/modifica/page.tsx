import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ApplicantEditForm } from "@/components/applicants/applicant-edit-form";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { PrismaApplicantQueryRepository } from "@/repositories/prisma/applicant-query.repository";
import { updateApplicantAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ApplicantEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("applicants:update");
  const { id } = await params;
  const { entry } = await new PrismaApplicantQueryRepository(getPrismaClient()).getById(id);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3"><Link href={`/iscritti/${id}`}><ArrowLeft className="size-4" aria-hidden="true" />Annulla modifica</Link></Button>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">{entry.registrationNumber}</p>
        <h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Modifica {entry.firstName} {entry.lastName}</h1>
        <p className="mt-2 text-stone-600">Numero pratica, data d’iscrizione e stato non sono modificabili.</p>
      </div>
      <ApplicantEditForm
        action={updateApplicantAction.bind(null, id)}
        values={{
          minor: {
            firstName: entry.firstName,
            lastName: entry.lastName,
            gender: entry.gender,
            birthDate: dateInput(entry.birthDate),
            birthPlace: entry.birthPlace,
            birthProvince: entry.birthProvince,
            fiscalCode: entry.fiscalCode,
            notes: entry.notes,
          },
          guardians: entry.guardians.map((guardian) => ({
            type: guardian.type,
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            birthDate: dateInput(guardian.birthDate),
            birthPlace: guardian.birthPlace,
            birthProvince: guardian.birthProvince,
            fiscalCode: guardian.fiscalCode,
            address: guardian.address,
            city: guardian.city,
            province: guardian.province,
            email: guardian.email,
            phone: guardian.phone,
          })),
        }}
      />
    </div>
  );
}

function dateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
