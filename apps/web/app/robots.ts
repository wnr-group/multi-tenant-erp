import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/teacher/",
          "/principal/",
          "/platform-admin/",
          "/api/",
          "/auth/",
          "/login",
        ],
      },
    ],
    sitemap: "https://connectmyskool.com/sitemap.xml",
  };
}
