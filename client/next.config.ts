import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "tesseract.js"]
};

export default nextConfig;
