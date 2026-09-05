import type { MetadataRoute } from "next";
import { INDEXABLE_PREFIXES } from "@/lib/robots";

// Default-deny: crawlers may only fetch the home page and the marketing/legal
// pages; the whole app is disallowed. (The middleware also serves
// noindex/noarchive headers so already-indexed app pages get removed.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/$", ...INDEXABLE_PREFIXES],
        disallow: "/",
      },
    ],
    host: "https://superadditive.app",
  };
}
