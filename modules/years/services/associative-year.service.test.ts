import { describe, expect, it, vi } from "vitest";

import type { BranchConfiguration } from "@/modules/branches/domain/branch";
import {
  AssociativeYearError,
  AssociativeYearService,
  type AssociativeYearRepository,
} from "./associative-year.service";

const NOW = new Date("2026-09-03T12:00:00Z");
const branches: BranchConfiguration[] = [
  { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8, colorHex: "#FDC500" },
  { branch: "EG", minAge: 12, maxAge: 15, entryAge: 12, colorHex: "#21A067" },
  { branch: "RS", minAge: 16, maxAge: 21, entryAge: 16, colorHex: "#E74030" },
];

function setup() {
  const repository: AssociativeYearRepository = {
    getCurrent: vi.fn(async () => null),
    getBranchConfiguration: vi.fn(async () => branches),
    createCurrentYear: vi.fn(async (command) => ({ id: "year-1", ...command, status: "ACTIVE_CALLS_CLOSED" as const })),
    openCalls: vi.fn(async () => ({ changed: true, candidates: 9 })),
    closeCalls: vi.fn(async () => ({ changed: true, resetApplicants: 2, statisticsRows: 4 })),
  };
  return { repository, service: new AssociativeYearService({ repository, clock: () => NOW }) };
}

describe("AssociativeYearService", () => {
  it("crea e rende corrente il nuovo anno lasciando le chiamate chiuse", async () => {
    const { repository, service } = setup();

    const result = await service.create(2026);

    expect(repository.createCurrentYear).toHaveBeenCalledWith({
      startYear: 2026,
      endYear: 2027,
      label: "2026/2027",
      createdAt: NOW,
    });
    expect(result.status).toBe("ACTIVE_CALLS_CLOSED");
  });

  it("non crea un anno mentre le chiamate correnti sono aperte", async () => {
    const { repository, service } = setup();
    vi.mocked(repository.getCurrent).mockResolvedValueOnce({
      id: "year-old", label: "2025/2026", startYear: 2025, status: "CALLS_OPEN",
    });

    await expect(service.create(2026)).rejects.toBeInstanceOf(AssociativeYearError);
    expect(repository.createCurrentYear).not.toHaveBeenCalled();
  });

  it("apre separatamente le chiamate usando solo gli anni di nascita di ingresso", async () => {
    const { repository, service } = setup();
    vi.mocked(repository.getCurrent).mockResolvedValueOnce({
      id: "year-1", label: "2026/2027", startYear: 2026, status: "ACTIVE_CALLS_CLOSED",
    });

    const result = await service.openCalls();

    expect(repository.openCalls).toHaveBeenCalledWith({
      associativeYearId: "year-1",
      openedAt: NOW,
      entryBirthYears: { LC: 2018, EG: 2014, RS: 2010 },
    });
    expect(result.candidates).toBe(9);
  });

  it("chiude solo una campagna aperta e delega snapshot prima del reset", async () => {
    const { repository, service } = setup();
    vi.mocked(repository.getCurrent).mockResolvedValueOnce({
      id: "year-1", label: "2026/2027", startYear: 2026, status: "CALLS_OPEN",
    });

    const result = await service.closeCalls();

    expect(repository.closeCalls).toHaveBeenCalledWith({ associativeYearId: "year-1", closedAt: NOW });
    expect(result).toMatchObject({ resetApplicants: 2, statisticsRows: 4 });
  });

  it("rifiuta apertura o chiusura in uno stato non coerente", async () => {
    const { repository, service } = setup();
    vi.mocked(repository.getCurrent).mockResolvedValue({
      id: "year-1", label: "2026/2027", startYear: 2026, status: "ACTIVE_CALLS_CLOSED",
    });
    await expect(service.closeCalls()).rejects.toMatchObject({ code: "CALLS_NOT_OPEN" });

    vi.mocked(repository.getCurrent).mockResolvedValue({
      id: "year-1", label: "2026/2027", startYear: 2026, status: "CALLS_OPEN",
    });
    await expect(service.openCalls()).rejects.toMatchObject({ code: "CALLS_ALREADY_OPEN" });
  });

  it("copre configurazioni mancanti e conflitti atomici", async () => {
    const missing = setup();
    await expect(missing.service.openCalls()).rejects.toMatchObject({ code: "YEAR_NOT_FOUND" });

    const branchesMissing = setup();
    vi.mocked(branchesMissing.repository.getCurrent).mockResolvedValueOnce({ id: "year", label: "2026/2027", startYear: 2026, status: "ACTIVE_CALLS_CLOSED" });
    vi.mocked(branchesMissing.repository.getBranchConfiguration).mockResolvedValueOnce(branches.slice(0, 2));
    await expect(branchesMissing.service.openCalls()).rejects.toMatchObject({ code: "BRANCH_CONFIGURATION_MISSING" });

    const openRace = setup();
    vi.mocked(openRace.repository.getCurrent).mockResolvedValueOnce({ id: "year", label: "2026/2027", startYear: 2026, status: "ACTIVE_CALLS_CLOSED" });
    vi.mocked(openRace.repository.openCalls).mockResolvedValueOnce({ changed: false, candidates: 0 });
    await expect(openRace.service.openCalls()).rejects.toMatchObject({ code: "CONCURRENT_CHANGE" });

    const closeRace = setup();
    vi.mocked(closeRace.repository.getCurrent).mockResolvedValueOnce({ id: "year", label: "2026/2027", startYear: 2026, status: "CALLS_OPEN" });
    vi.mocked(closeRace.repository.closeCalls).mockResolvedValueOnce({ changed: false, resetApplicants: 0, statisticsRows: 0 });
    await expect(closeRace.service.closeCalls()).rejects.toMatchObject({ code: "CONCURRENT_CHANGE" });
  });

  it("nega anni fuori intervallo, duplicati o stati conclusi", async () => {
    const invalid = setup();
    await expect(invalid.service.create(1999)).rejects.toMatchObject({ code: "INVALID_YEAR" });
    vi.mocked(invalid.repository.getCurrent).mockResolvedValueOnce({ id: "year", label: "2026/2027", startYear: 2026, status: "ACTIVE_CALLS_CLOSED" });
    await expect(invalid.service.create(2026)).rejects.toMatchObject({ code: "YEAR_ALREADY_ACTIVE" });
    vi.mocked(invalid.repository.getCurrent).mockResolvedValueOnce({ id: "year", label: "2026/2027", startYear: 2026, status: "CLOSED" });
    await expect(invalid.service.openCalls()).rejects.toMatchObject({ code: "CONCURRENT_CHANGE" });
  });
});
