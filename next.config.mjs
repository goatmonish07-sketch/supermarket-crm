import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep Prisma and pg out of the bundle so the Workers build can resolve them.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;

// Lets `next dev` read Cloudflare bindings; no effect on production builds.
initOpenNextCloudflareForDev();
