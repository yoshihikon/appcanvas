import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 配布時はElectron mainがこのstandaloneサーバーを子プロセス起動する
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
