import type { Extraction } from "./intentParser";
import { extractIntent } from "./intentParser";

/**
 * Optional LLM upgrade path. The deterministic extractor in ./intentParser.ts is
 * always the source of truth for the demo; if LLM_API_KEY or OPENAI_API_KEY is present we
 * ask the LLM to fill the fields the rules left at their defaults, and merge
 * only those. Any failure falls back silently to the rule output.
 */

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

export const llmEnabled = () =>
  Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);

const SYSTEM = `You extract structured travel constraints from a traveler's sentence.
Return ONLY minified JSON with any of these keys you can determine confidently:
{"availableMin":number,"startMin":number,"budgetPerPerson":number,"groupSize":number,
"travelerType":"solo|couple|family|friends|parents|kids",
"interests":["culture"|"food"|"adventure"|"workshop"|"nature"|"wellness"|"shopping"|"nightlife"|"event"],
"preference":"local_only|prefer_local|no_preference|popular",
"mobility":"low_walking|moderate|high|wheelchair",
"pace":"relaxing|balanced|energetic"}
startMin and availableMin are minutes. Omit keys you cannot infer. No prose.`;

export async function extractWithLlm(raw: string): Promise<{
  extraction: Extraction;
  usedLlm: boolean;
}> {
  const base = extractIntent(raw);
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || !raw.trim()) return { extraction: base, usedLlm: false };

  try {
    const endpoint =
      process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: raw },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { extraction: base, usedLlm: false };

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    // merge: the LLM only fills gaps the rules could not resolve
    const merged: Extraction = { ...base };
    for (const key of Object.keys(parsed)) {
      const field = (merged as Record<string, any>)[key];
      if (!field || field.confidence !== "default") continue;
      (merged as Record<string, any>)[key] = {
        value: parsed[key],
        evidence: "inferred by LLM from your sentence",
        confidence: "inferred",
      };
    }
    return { extraction: merged, usedLlm: true };
  } catch {
    return { extraction: base, usedLlm: false };
  }
}
