import { getPrismaClient } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: responseHeaders });
  } catch (error) {
    console.error("Health check database non riuscito", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: responseHeaders },
    );
  }
}
