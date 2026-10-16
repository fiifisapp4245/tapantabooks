import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Integrations and the audit trail moved into Settings; keep old links working.
  async redirects() {
    return ["connections", "imports", "mapping", "audit-trail"].map((p) => ({
      source: `/${p}`,
      destination: `/settings/${p}`,
      permanent: false,
    }))
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
