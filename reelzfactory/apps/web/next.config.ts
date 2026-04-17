import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [],
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.32:3000",
  ],
};

export default nextConfig;