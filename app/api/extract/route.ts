import { NextResponse } from "next/server";
import { toRequest } from "@/lib/nlp/intentParser";
import { extractWithLlm, llmEnabled } from "@/lib/nlp/smartExtract";

export async function POST(req: Request) {
  let raw = "";
  try {
    const body = (await req.json()) as { text?: string };
    raw = (body?.text ?? "").trim();
  } catch {
    raw = "";
  }
  const { extraction, usedLlm } = await extractWithLlm(raw);
  return NextResponse.json({
    extraction,
    request: toRequest(extraction, raw),
    engine: usedLlm ? "llm" : "rules",
    llmAvailable: llmEnabled(),
  });
}
