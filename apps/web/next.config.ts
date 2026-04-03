import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bike-check/core", "@bike-check/db", "@bike-check/shared"],
};

export default nextConfig;
