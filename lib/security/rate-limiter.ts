import { createHmac } from "node:crypto";

export interface RateLimitConsumeCommand {
  keyHash: string;
  now: Date;
  windowMs: number;
  limit: number;
}

export interface RateLimitRepository {
  consume(command: RateLimitConsumeCommand): Promise<boolean>;
}

export class RateLimitExceededError extends Error {
  constructor() {
    super("Hai effettuato troppi tentativi. Attendi qualche minuto e riprova.");
    this.name = "RateLimitExceededError";
  }
}

interface HmacRateLimiterOptions {
  repository: RateLimitRepository;
  secret: string;
  limit: number;
  windowMs: number;
  clock?: () => Date;
}

export class HmacRateLimiter {
  private readonly clock: () => Date;

  constructor(private readonly options: HmacRateLimiterOptions) {
    this.clock = options.clock ?? (() => new Date());
  }

  async assertAllowed(source: string): Promise<void> {
    const keyHash = createHmac("sha256", this.options.secret)
      .update(`public-registration:${source}`)
      .digest("hex");
    const allowed = await this.options.repository.consume({
      keyHash,
      now: this.clock(),
      windowMs: this.options.windowMs,
      limit: this.options.limit,
    });
    if (!allowed) throw new RateLimitExceededError();
  }
}

export function getClientSource(headers: Headers): string {
  const forwarded =
    headers.get("cf-connecting-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip");
  const address = forwarded?.split(",")[0]?.trim() || "unavailable";
  const agent = headers.get("user-agent")?.slice(0, 200) || "unknown-agent";
  return `${address}|${agent}`;
}
