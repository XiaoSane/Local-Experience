import type { TravelerRequest } from "./types";

function toBase64(str: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(str);
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin);
}

function fromBase64(b64: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** URL-safe base64 so a whole traveler request travels in a shareable link. */
export function encodeRequest(req: TravelerRequest): string {
  const json = JSON.stringify(req);
  const b64 = toBase64(json);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRequest(q: string | null): TravelerRequest | null {
  if (!q) return null;
  try {
    let b64 = q.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = fromBase64(b64);
    return JSON.parse(json) as TravelerRequest;
  } catch {
    return null;
  }
}
