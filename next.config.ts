import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

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
      ...(isProduction
        ? [
            {
              // Static assets (JS/CSS with hashed filenames) can still be
              // cached long-term in production because the hash changes on
              // every build. In dev, this breaks visual QA by serving stale
              // client bundles after source edits.
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
