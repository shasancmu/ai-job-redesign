/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs-dist locates its worker/cmap/font assets via import.meta.url. Bundling
  // it into a server route rewrites those to bogus paths and it throws at
  // runtime (and Vercel's tracer never ships the assets). Keeping it external
  // leaves it as real files on disk that resolve correctly and get traced into
  // the function. This is what makes PDF text extraction work in production.
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "pdf-parse"],
    // Belt and suspenders for Vercel: force the pdfjs legacy build into each
    // function that extracts PDF text, so the serverless file tracer can never
    // drop it (its assets are resolved dynamically and are easy to miss).
    outputFileTracingIncludes: {
      "/api/mechanics/autobuild": ["./node_modules/pdfjs-dist/legacy/build/**"],
      "/api/mechanics/pdf-source": ["./node_modules/pdfjs-dist/legacy/build/**"],
      "/api/board": ["./node_modules/pdfjs-dist/legacy/build/**"],
    },
  },
};

export default nextConfig;
