// Seal/unseal the DGP answer key so it can be stored in the student's own
// workspace row WITHOUT the student being able to read it. AES-256-GCM with a
// key derived from a server-only secret; GCM authenticates, so a tampered blob
// fails to open (the student can't forge a different "true model" either).
//
// Server-only. Never import this into a client component.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import type { Dgp } from "./types";

function key(): Buffer {
  const secret = process.env.REGSIM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "regsim-dev-secret-change-me";
  return scryptSync(secret, "regsim-v1", 32);
}

export function sealDgp(dgp: Dgp): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const pt = Buffer.from(JSON.stringify(dgp), "utf8");
  const enc = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function unsealDgp(sealed: string): Dgp | null {
  try {
    const [ver, ivB, tagB, encB] = sealed.split(".");
    if (ver !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const dec = Buffer.concat([decipher.update(Buffer.from(encB, "base64url")), decipher.final()]);
    return JSON.parse(dec.toString("utf8")) as Dgp;
  } catch {
    return null;
  }
}
