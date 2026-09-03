import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

import { prepareImportRows } from "../modules/import/waiting-list-import";
import { PrismaWaitingListImportRepository } from "../repositories/prisma/waiting-list-import.repository";

async function main() {
  const fileArgument = process.argv[2];
  const privacyVersion = option("--privacy-version");
  const reportPath = option("--report");
  const apply = process.argv.includes("--apply");

  if (!fileArgument || !privacyVersion) {
    console.error("Uso: npm run import:waiting-list -- <file.csv|file.xlsx> --privacy-version=VERSION [--apply] [--report=report.json]");
    process.exitCode = 1;
    return;
  }
  await run(resolve(fileArgument), privacyVersion, apply, reportPath ? resolve(reportPath) : null);
}

async function run(filePath: string, version: string, shouldApply: boolean, outputPath: string | null) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL non configurata.");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const repository = new PrismaWaitingListImportRepository(client);
    if (!await repository.validatePrivacyVersion(version)) throw new Error(`Versione privacy ${version} non presente nel database.`);
    const rawRows = await readRows(filePath);
    const prepared = prepareImportRows(rawRows, version);
    const existing = await repository.findExistingFiscalCodes(prepared.valid.map((row) => row.minor.fiscalCode));
    const errors = [...prepared.errors, ...prepared.valid.filter((row) => existing.has(row.minor.fiscalCode)).map((row) => ({ row: row.sourceRow, code: "DUPLICATE_DATABASE", message: "Codice Fiscale già presente nel database." }))];
    const candidates = prepared.valid.filter((row) => !existing.has(row.minor.fiscalCode));
    const imported: Array<{ row: number; registrationNumber: string }> = [];
    if (shouldApply) {
      for (const row of candidates) {
        const result = await repository.importRow(row);
        if (result.imported) imported.push({ row: row.sourceRow, registrationNumber: result.registrationNumber });
        else errors.push({ row: row.sourceRow, code: result.reason, message: "Codice Fiscale già presente nel database." });
      }
    }
    const report = { mode: shouldApply ? "APPLY" : "DRY_RUN", file: filePath, validRows: candidates.length, importedRows: imported.length, imported, errors };
    const serialized = JSON.stringify(report, null, 2);
    console.log(serialized);
    if (outputPath) await writeFile(outputPath, serialized, "utf8");
    if (errors.length > 0) process.exitCode = 2;
  } finally {
    await client.$disconnect();
  }
}

async function readRows(filePath: string): Promise<Array<Record<string, unknown>>> {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return parse(await readFile(filePath, "utf8"), { columns: true, bom: true, skip_empty_lines: true, trim: true });
  }
  if (extension === ".xlsx") {
    const rows = await readSheet(filePath);
    const [header, ...data] = rows;
    if (!header) return [];
    return data.map((row) => Object.fromEntries(header.map((cell, index) => [String(cell ?? ""), row[index]])));
  }
  throw new Error("Formato non supportato: usa CSV o XLSX.");
}

function option(name: string): string | null {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || null;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore import non riconosciuto.");
  process.exitCode = 1;
});
