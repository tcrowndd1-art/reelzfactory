import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// 루트 .env를 로드 — .env.local 이중 관리 제거
config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: [],
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.32:3000",
  ],
};

export default nextConfig;
