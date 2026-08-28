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
  },
};

export default nextConfig;
