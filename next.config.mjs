/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse pulls in pdfjs-dist, which relies on a worker and import.meta.url
  // to find it. Webpack-bundling it into a server route breaks that at runtime;
  // loading it from node_modules at runtime (external) works. Keeps the
  // upload-and-go PDF extraction working.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
