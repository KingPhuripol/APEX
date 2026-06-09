import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent HTML pages from being cached — avoids stale chunk hash errors after rebuild
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
  // Allow images from external hosts (PACS, sample slides)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Proxy /api/* calls → backend (works in Docker via internal service name)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3005";
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/api/auth/:path*`,
      },
      {
        source: "/api/analysis/:path*",
        destination: `${backendUrl}/api/analysis/:path*`,
      },
      {
        source: "/api/audit/:path*",
        destination: `${backendUrl}/api/audit/:path*`,
      },
      {
        source: "/api/patients/:path*",
        destination: `${backendUrl}/api/patients/:path*`,
      },
    ];
  },
};

export default nextConfig;
