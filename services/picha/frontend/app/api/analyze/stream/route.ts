/**
 * SSE Proxy — Next.js API route that forwards streaming requests to ai-service.
 * This avoids browser CORS issues and Docker internal hostname resolution.
 *
 * Browser → /api/analyze/stream (same origin) → ai-service:8200/analyze
 */
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8200";

  let upstream: Response;
  try {
    upstream = await fetch(`${aiServiceUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    const errMsg = `data: {"agent":"System","type":"error","message":"AI service unreachable","is_final":false}\n\ndata: [DONE]\n\n`;
    return new Response(errMsg, {
      status: 503,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const errMsg = `data: {"agent":"System","type":"error","message":"AI service error ${upstream.status}","is_final":false}\n\ndata: [DONE]\n\n`;
    return new Response(errMsg, {
      status: upstream.status,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
