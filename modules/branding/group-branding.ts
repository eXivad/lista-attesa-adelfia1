import { z } from "zod";

export const DEFAULT_GROUP_NAME = "Gruppo Scout";
export const MAX_GROUP_LOGO_BYTES = 2 * 1024 * 1024;

export const groupNameSchema = z.string().trim().min(2, "Inserisci il nome del gruppo.").max(120, "Il nome del gruppo è troppo lungo.");

export type GroupLogoMimeType = "image/png" | "image/jpeg" | "image/webp";

interface GroupLogoCandidate {
  mimeType: string;
  bytes: Uint8Array;
  size: number;
}

export function validateGroupLogo(candidate: GroupLogoCandidate): { mimeType: GroupLogoMimeType } {
  if (candidate.size <= 0 || candidate.bytes.byteLength <= 0) {
    throw new Error("Seleziona un file immagine non vuoto.");
  }
  if (candidate.size > MAX_GROUP_LOGO_BYTES || candidate.bytes.byteLength > MAX_GROUP_LOGO_BYTES) {
    throw new Error("Il logo non può superare 2 MB.");
  }

  const detected = detectImageMimeType(candidate.bytes);
  if (!detected || detected !== candidate.mimeType) {
    throw new Error("Formato logo non valido: usa PNG, JPEG o WebP.");
  }
  return { mimeType: detected };
}

function detectImageMimeType(bytes: Uint8Array): GroupLogoMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}
