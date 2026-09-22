import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  EMAIL_LOGO_MAX_BYTES,
  EMAIL_LOGO_MAX_DIMENSION,
  optimizeGmailInlineLogo,
} from "./gmail-mail-logo";

describe("optimizeGmailInlineLogo", () => {
  it("ridimensiona un logo grande e lo converte in un PNG leggero", async () => {
    const input = await sharp({
      create: {
        width: 1_000,
        height: 1_000,
        channels: 4,
        background: { r: 76, g: 29, b: 149, alpha: 1 },
      },
    }).png({ compressionLevel: 0 }).toBuffer();

    const result = await optimizeGmailInlineLogo({
      content: input,
      mimeType: "image/png",
    });
    const metadata = await sharp(result.content).metadata();

    expect(result.mimeType).toBe("image/png");
    expect(metadata.width).toBeLessThanOrEqual(EMAIL_LOGO_MAX_DIMENSION);
    expect(metadata.height).toBeLessThanOrEqual(EMAIL_LOGO_MAX_DIMENSION);
    expect(result.content.byteLength).toBeLessThan(input.byteLength);
    expect(result.content.byteLength).toBeLessThanOrEqual(EMAIL_LOGO_MAX_BYTES);
  });

  it("rifiuta contenuti non decodificabili invece di allegarli", async () => {
    await expect(optimizeGmailInlineLogo({
      content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      mimeType: "image/png",
    })).rejects.toThrow("Logo email non elaborabile");
  });

  it("incorpora uno sfondo bianco nel PNG per impedire l'inversione della trasparenza", async () => {
    const transparentInput = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).png().toBuffer();

    const result = await optimizeGmailInlineLogo({
      content: transparentInput,
      mimeType: "image/png",
    });
    const metadata = await sharp(result.content).metadata();
    const pixel = await sharp(result.content).raw().toBuffer();

    expect(metadata.width).toBe(EMAIL_LOGO_MAX_DIMENSION);
    expect(metadata.height).toBe(EMAIL_LOGO_MAX_DIMENSION);
    expect(metadata.hasAlpha).toBe(false);
    expect([...pixel.subarray(0, 3)]).toEqual([255, 255, 255]);
  });
});
