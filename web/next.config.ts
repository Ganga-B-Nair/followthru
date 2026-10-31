import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql ships a native binary; keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Keep the dev badge out of demo recordings.
  devIndicators: false,
};

export default nextConfig;
