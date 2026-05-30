import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const header =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown";
  return header.split(",")[0]?.trim() || "unknown";
}

export function checkRateLimit(request: Request, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(request);
  const mapKey = `${options.key}:${ip}`;
  const current = buckets.get(mapKey);

  if (!current || current.resetAt <= now) {
    buckets.set(mapKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Please retry shortly.",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  current.count += 1;
  buckets.set(mapKey, current);
  return null;
}

