import { NextRequest, NextResponse } from "next/server";
import { buildAreaContext } from "@/lib/ai/context";
import { buildUserPrompt, PROMPT_VERSION, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { FALLBACK_ANSWER, validateAnswer } from "@/lib/ai/validate";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const MAX_QUESTION_LEN = 300;

/** Naive in-memory rate limit — placeholder until real infrastructure. */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { configured: false, error: "Ask AreaIQ is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many questions — try again in a minute." }, { status: 429 });
  }

  let body: { areaId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim().slice(0, MAX_QUESTION_LEN);
  if (!body.areaId || question.length < 3) {
    return NextResponse.json({ error: "areaId and question are required." }, { status: 400 });
  }

  const ctx = buildAreaContext(body.areaId);
  if (!ctx) return NextResponse.json({ error: "Unknown area." }, { status: 404 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(ctx.areaName, ctx.factSheet, question) }],
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    console.error(`Anthropic API ${res.status}: ${detail}`);
    return NextResponse.json({ error: "The AI service is unavailable right now." }, { status: 502 });
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();

  const allowedIds = ctx.sources.map((s) => s.id);
  const check = validateAnswer(text, allowedIds);
  if (!check.ok) {
    console.warn(`Answer rejected (${PROMPT_VERSION}): ${check.reasons.join("; ")}`);
    return NextResponse.json({
      answer: FALLBACK_ANSWER,
      sources: [],
      rejected: true,
      promptVersion: PROMPT_VERSION,
    });
  }

  const cited = ctx.sources.filter((s) => check.citedIds.includes(s.id));
  return NextResponse.json({ answer: text, sources: cited, promptVersion: PROMPT_VERSION });
}
