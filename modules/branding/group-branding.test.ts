import { describe, expect, it } from "vitest";

import { groupNameSchema, validateGroupLogo } from "./group-branding";

describe("group branding", () => {
  it("normalizza e valida il nome del gruppo", () => {
    expect(groupNameSchema.parse("  Gruppo Scout Adelfia 1  ")).toBe("Gruppo Scout Adelfia 1");
    expect(groupNameSchema.safeParse(" ").success).toBe(false);
  });

  it.each([
    ["image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
    ["image/webp", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
  ])("accetta un file %s con firma coerente", (mimeType, bytes) => {
    expect(validateGroupLogo({ mimeType, bytes, size: bytes.byteLength })).toEqual({ mimeType });
  });

  it("rifiuta tipo dichiarato incoerente, SVG e file oltre 2 MB", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateGroupLogo({ mimeType: "image/jpeg", bytes: png, size: png.byteLength })).toThrow(/formato/i);
    expect(() => validateGroupLogo({ mimeType: "image/svg+xml", bytes: new Uint8Array([60, 115, 118, 103]), size: 4 })).toThrow(/formato/i);
    expect(() => validateGroupLogo({ mimeType: "image/png", bytes: png, size: 2 * 1024 * 1024 + 1 })).toThrow(/2 MB/i);
  });
});
