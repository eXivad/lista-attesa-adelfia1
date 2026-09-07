import { getGroupBrandingRepository } from "@/lib/server/group-branding";

export const dynamic = "force-dynamic";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable";
const REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate";

export async function GET(request: Request) {
  const logo = await getGroupBrandingRepository().getCurrentLogo();
  if (!logo) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const etag = `"${logo.version}"`;
  const requestedVersion = new URL(request.url).searchParams.get("v");
  const cacheControl = requestedVersion === logo.version
    ? IMMUTABLE_CACHE_CONTROL
    : REVALIDATE_CACHE_CONTROL;
  const responseHeaders = {
    "Cache-Control": cacheControl,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: responseHeaders });
  }

  return new Response(logo.content, {
    headers: {
      ...responseHeaders,
      "Content-Length": String(logo.byteSize),
      "Content-Type": logo.mimeType,
    },
  });
}
