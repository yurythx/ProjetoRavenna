import type { MetadataRoute } from "next";

import { getSiteBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/artigos/", "/dashboard/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
