import { getEntryBirthYears, type BranchConfiguration } from "@/modules/branches/domain/branch";

export type AssociativeYearStatus = "CREATED" | "ACTIVE_CALLS_CLOSED" | "CALLS_OPEN" | "CLOSED";

export interface CurrentAssociativeYear {
  id: string;
  label: string;
  startYear: number;
  status: AssociativeYearStatus;
}

export interface CreateAssociativeYearCommand {
  startYear: number;
  endYear: number;
  label: string;
  createdAt: Date;
}

export interface OpenCallsCommand {
  associativeYearId: string;
  openedAt: Date;
  entryBirthYears: { LC: number; EG: number; RS: number };
}

export interface CloseCallsCommand {
  associativeYearId: string;
  closedAt: Date;
}

export interface AssociativeYearRepository {
  getCurrent(): Promise<CurrentAssociativeYear | null>;
  getBranchConfiguration(): Promise<BranchConfiguration[]>;
  createCurrentYear(command: CreateAssociativeYearCommand): Promise<CurrentAssociativeYear>;
  openCalls(command: OpenCallsCommand): Promise<{ changed: boolean; candidates: number }>;
  closeCalls(command: CloseCallsCommand): Promise<{
    changed: boolean;
    resetApplicants: number;
    statisticsRows: number;
  }>;
}

export type AssociativeYearErrorCode =
  | "INVALID_YEAR"
  | "YEAR_NOT_FOUND"
  | "YEAR_ALREADY_ACTIVE"
  | "CALLS_ALREADY_OPEN"
  | "CALLS_NOT_OPEN"
  | "CONCURRENT_CHANGE"
  | "BRANCH_CONFIGURATION_MISSING";

export class AssociativeYearError extends Error {
  constructor(public readonly code: AssociativeYearErrorCode, public readonly userMessage: string) {
    super(userMessage);
    this.name = "AssociativeYearError";
  }
}

interface AssociativeYearServiceOptions {
  repository: AssociativeYearRepository;
  clock?: () => Date;
}

export class AssociativeYearService {
  private readonly clock: () => Date;

  constructor(private readonly options: AssociativeYearServiceOptions) {
    this.clock = options.clock ?? (() => new Date());
  }

  async create(startYear: number) {
    if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) {
      throw new AssociativeYearError("INVALID_YEAR", "Inserisci un anno iniziale valido.");
    }
    const current = await this.options.repository.getCurrent();
    if (current?.status === "CALLS_OPEN") {
      throw new AssociativeYearError(
        "CALLS_ALREADY_OPEN",
        "Chiudi le chiamate correnti prima di creare un nuovo anno associativo.",
      );
    }
    if (current && startYear <= current.startYear) {
      throw new AssociativeYearError("YEAR_ALREADY_ACTIVE", "Questo anno associativo è già attivo o concluso.");
    }
    return this.options.repository.createCurrentYear({
      startYear,
      endYear: startYear + 1,
      label: `${startYear}/${startYear + 1}`,
      createdAt: this.clock(),
    });
  }

  async openCalls() {
    const current = await this.options.repository.getCurrent();
    if (!current) throw new AssociativeYearError("YEAR_NOT_FOUND", "Crea prima l'anno associativo.");
    if (current.status === "CALLS_OPEN") {
      throw new AssociativeYearError("CALLS_ALREADY_OPEN", "Le chiamate sono già aperte.");
    }
    if (current.status !== "ACTIVE_CALLS_CLOSED") {
      throw new AssociativeYearError("CONCURRENT_CHANGE", "L'anno associativo non può essere aperto.");
    }
    const configuration = await this.options.repository.getBranchConfiguration();
    if (configuration.length !== 3) {
      throw new AssociativeYearError(
        "BRANCH_CONFIGURATION_MISSING",
        "Completa la configurazione delle tre branche prima di aprire le chiamate.",
      );
    }
    const result = await this.options.repository.openCalls({
      associativeYearId: current.id,
      openedAt: this.clock(),
      entryBirthYears: getEntryBirthYears(current.startYear, configuration),
    });
    if (!result.changed) {
      throw new AssociativeYearError("CONCURRENT_CHANGE", "Le chiamate sono state modificate da un altro utente.");
    }
    return result;
  }

  async closeCalls() {
    const current = await this.options.repository.getCurrent();
    if (!current || current.status !== "CALLS_OPEN") {
      throw new AssociativeYearError("CALLS_NOT_OPEN", "Non ci sono chiamate aperte da chiudere.");
    }
    const result = await this.options.repository.closeCalls({
      associativeYearId: current.id,
      closedAt: this.clock(),
    });
    if (!result.changed) {
      throw new AssociativeYearError("CONCURRENT_CHANGE", "Le chiamate sono state modificate da un altro utente.");
    }
    return result;
  }
}
