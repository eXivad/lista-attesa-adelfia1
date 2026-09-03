import { expect, it, vi } from "vitest";

import { RetentionService, type RetentionRepository } from "./retention.service";

it("seleziona terminali oltre retention e fuori età, preservando solo l'HMAC dei rifiutati", async () => {
  const repository: RetentionRepository = {
    getMaximumAge: vi.fn(async () => 21),
    findCandidates: vi.fn(async () => [
      { id: "rejected", status: "RIFIUTATO" as const, fiscalCode: "RSSMRA18E12A662X" },
      { id: "accepted", status: "ACCETTATO" as const, fiscalCode: "VRDNNA85C41A662Z" },
      { id: "old", status: "IN_ATTESA" as const, fiscalCode: "RSSLGU83M22A662Y" },
    ]),
    deleteCandidates: vi.fn(async (commands) => commands.length),
  };
  const service = new RetentionService({ repository, hmacSecret: "test-secret-with-at-least-32-characters", clock: () => new Date("2026-09-03T12:00:00Z") });

  const preview = await service.run({ retentionDays: 365, apply: false });
  expect(repository.findCandidates).toHaveBeenCalledWith({ terminalOnOrBefore: new Date("2025-09-03T12:00:00Z"), bornOnOrBefore: new Date("2004-09-03T00:00:00Z") });
  expect(preview).toMatchObject({ candidates: 3, deleted: 0 });
  expect(repository.deleteCandidates).not.toHaveBeenCalled();

  const result = await service.run({ retentionDays: 365, apply: true });
  expect(result.deleted).toBe(3);
  expect(repository.deleteCandidates).toHaveBeenCalledWith(expect.arrayContaining([
    { id: "rejected", blockedIdentifierHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    { id: "accepted" },
    { id: "old" },
  ]));
});
