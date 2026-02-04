import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lighthouse", "chrome-launcher", "puppeteer-core", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
