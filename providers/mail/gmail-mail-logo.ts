import sharp from "sharp";

export const EMAIL_LOGO_MAX_DIMENSION = 96;
export const EMAIL_LOGO_MAX_BYTES = 64 * 1024;

export interface GmailMailLogo {
  content: Uint8Array;
  mimeType: string;
}

export type GmailMailLogoOptimizer = (logo: GmailMailLogo) => Promise<GmailMailLogo>;

export async function optimizeGmailInlineLogo(logo: GmailMailLogo): Promise<GmailMailLogo> {
  try {
    const content = await sharp(Buffer.from(logo.content), {
      failOn: "error",
      limitInputPixels: 16_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: EMAIL_LOGO_MAX_DIMENSION,
        height: EMAIL_LOGO_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        effort: 10,
      })
      .toBuffer();

    if (content.byteLength === 0 || content.byteLength > EMAIL_LOGO_MAX_BYTES) {
      throw new Error("optimized logo exceeds safe email size");
    }

    return {
      content: new Uint8Array(content),
      mimeType: "image/png",
    };
  } catch {
    throw new Error("Logo email non elaborabile.");
  }
}
