import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Prevent aggressive CDN caching on HTML pages.
  // The old config cached static pages for 1 year, meaning
  // deployments were invisible until cache expired.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Static assets (JS/CSS with hashed filenames) can still be cached
        // long-term because the hash changes on every build.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
