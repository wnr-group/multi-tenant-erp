import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@erp/shared", "@erp/ui"],
};

export default nextConfig;
