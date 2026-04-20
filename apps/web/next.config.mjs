/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@erp/shared", "@erp/ui"],
  allowedDevOrigins: ["school1.lvh.me", "core.lvh.me", "*.lvh.me"],
};

export default nextConfig;
