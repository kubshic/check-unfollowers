import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: {
    // 팔로워가 많은 계정도 아이디 목록 전체를 한 번에 저장할 수 있도록 여유 있게 둔다.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
