// Seal/unseal the hidden scenario (the true-value effect matrix is the answer
// key) so it can ride in the student's workspace and be posted back to the run
// route without being readable. AES-256-GCM, server-only.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import type { HiddenScenario } from "./types";

function key(): Buffer {
  const secret = process.env.REGSIM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "regsim-dev-secret-change-me";
  return scryptSync(secret, "incentive-v1", 32);
}

export function sealScenario(s: HiddenScenario): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(s), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function unsealScenario(sealed: string): HiddenScenario | null {
  try {
    const [ver, ivB, tagB, encB] = sealed.split(".");
    if (ver !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
    d.setAuthTag(Buffer.from(tagB, "base64url"));
    const dec = Buffer.concat([d.update(Buffer.from(encB, "base64url")), d.final()]);
    return JSON.parse(dec.toString("utf8")) as HiddenScenario;
  } catch {
    return null;
  }
}
