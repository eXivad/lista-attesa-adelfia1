import { getGroupBrandingRepository } from "@/lib/server/group-branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await getGroupBrandingRepository().getCurrentLogo();
  if (!logo) return new Response(null, { status: 404 });

  return new Response(logo.content, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(logo.byteSize),
      "Content-Type": logo.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
