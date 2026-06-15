/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@erp/shared", "@erp/ui"],
  allowedDevOrigins: ["lvh.me", "*.lvh.me", "school1.lvh.me", "core.lvh.me", "meow.lvh.me"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
