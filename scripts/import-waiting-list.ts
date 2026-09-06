import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

import {
  prepareImportRows,
  type WaitingListImportOptions,
} from "../modules/import/waiting-list-import";
import {
  PrismaWaitingListImportRepository,
  WaitingListImportConflictError,
} from "../repositories/prisma/waiting-list-import.repository";

interface ReportError {
  row: number;
  code: string;
  message: string;
}

async function main() {
  const argumentsList = process.argv.slice(2);
  const fileArgument = argumentsList.find((argument) => !argument.startsWith("--"));
  const privacyVersion = option("--privacy-version");
  const reportPath = option("--report");
  const apply = argumentsList.includes("--apply");
  const legacy = argumentsList.includes("--legacy");

  if (!fileArgument || (!legacy && !privacyVersion) || (legacy && privacyVersion)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const importOptions: WaitingListImportOptions = legacy
    ? { mode: "legacy", timeZone: process.env.IMPORT_TIMEZONE || "Europe/Rome" }
    : {
        mode: "complete",
        privacyPolicyVersion: privacyVersion!,
        timeZone: process.env.IMPORT_TIMEZONE || "Europe/Rome",
      };
  await run(
    resolve(fileArgument),
    importOptions,
    apply,
    reportPath ? resolve(reportPath) : null,
  );
}

async function run(
  filePath: string,
  importOptions: WaitingListImportOptions,
  shouldApply: boolean,
  outputPath: string | null,
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL non configurata.");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const repository = new PrismaWaitingListImportRepository(client);
    if (
      importOptions.mode === "complete"
      && !await repository.validatePrivacyVersion(importOptions.privacyPolicyVersion)
    ) {
      throw new Error(
        `Versione privacy ${importOptions.privacyPolicyVersion} non presente nel database.`,
      );
    }

    const rawRows = await readRows(filePath);
    const prepared = prepareImportRows(rawRows, importOptions);
    const existingKeys = await repository.findExistingKeys();
    const databaseDuplicates = prepared.valid.filter((row) =>
      row.duplicateKeys.some((key) => existingKeys.has(key))
    );
    const duplicateRows = new Set(databaseDuplicates.map((row) => row.sourceRow));
    const errors: ReportError[] = [
      ...prepared.errors,
      ...databaseDuplicates.map((row) => ({
        row: row.sourceRow,
        code: "DUPLICATE_DATABASE",
        message: "Iscritto già presente nel database.",
      })),
    ];
    const candidates = prepared.valid.filter((row) => !duplicateRows.has(row.sourceRow));
    let mode: "DRY_RUN" | "APPLY" | "APPLY_ABORTED" = shouldApply ? "APPLY" : "DRY_RUN";
    let imported: Array<{ row: number; registrationNumber: string }> = [];

    if (shouldApply && errors.length > 0) {
      mode = "APPLY_ABORTED";
    } else if (shouldApply) {
      try {
        imported = (await repository.importRows(candidates)).map(({ row, registrationNumber }) => ({
          row,
          registrationNumber,
        }));
      } catch (error) {
        if (!(error instanceof WaitingListImportConflictError)) throw error;
        mode = "APPLY_ABORTED";
        errors.push({
          row: error.sourceRow,
          code: "DUPLICATE_DATABASE",
          message: error.message,
        });
        imported = [];
      }
    }

    const report = {
      mode,
      importType: importOptions.mode.toUpperCase(),
      file: filePath,
      totalRows: rawRows.length,
      validRows: prepared.valid.length,
      importableRows: candidates.length,
      importedRows: imported.length,
      imported,
      errorCount: errors.length,
      errors,
    };
    const serialized = JSON.stringify(report, null, 2);
    console.log(serialized);
    if (outputPath) {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
    }
    if (errors.length > 0) process.exitCode = 2;
  } finally {
    await client.$disconnect();
  }
}

async function readRows(filePath: string): Promise<Array<Record<string, unknown>>> {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return parse(await readFile(filePath, "utf8"), {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count_less: true,
    });
  }
  if (extension === ".xlsx") {
    const rows = await readSheet(filePath);
    const [header, ...data] = rows;
    if (!header) return [];
    return data.map((row) => Object.fromEntries(
      header.map((cell, index) => [String(cell ?? ""), row[index]]),
    ));
  }
  throw new Error("Formato non supportato: usa CSV o XLSX.");
}

function option(name: string): string | null {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || null;
}

function printUsage() {
  console.error([
    "Uso import completo:",
    "  pnpm run import:waiting-list -- <file.csv|file.xlsx> --privacy-version=VERSION [--apply] [--report=report.json]",
    "Uso import storico con campi mancanti e consenso non registrato:",
    "  pnpm run import:waiting-list -- <file.csv|file.xlsx> --legacy [--apply] [--report=report.json]",
  ].join("\n"));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : "Errore import non riconosciuto.");
  process.exitCode = 1;
});
