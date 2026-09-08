import { getGroupBrandingSettings } from "@/lib/server/group-branding";

export const dynamic = "force-dynamic";

const REDIRECT_CACHE_CONTROL = "public, max-age=300, s-maxage=300";
const FALLBACK_ICON_URL = "/favicon.ico";

export async function GET(request: Request) {
  let logoVersion: string | null = null;

  try {
    ({ logoVersion } = await getGroupBrandingSettings());
  } catch {
    console.error("Impossibile caricare il logo dinamico per la favicon.");
  }

  const targetPath = logoVersion
    ? `/api/branding/logo?v=${encodeURIComponent(logoVersion)}`
    : FALLBACK_ICON_URL;

  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": REDIRECT_CACHE_CONTROL,
      Location: new URL(targetPath, request.url).toString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
