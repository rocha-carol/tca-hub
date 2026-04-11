import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/student",
        destination: "/estudante",
        permanent: true,
      },
      {
        source: "/student/:path*",
        destination: "/estudante/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/estudante/grupo/:path*",
        destination: "/groups/:path*",
      },
      {
        source: "/estudante",
        destination: "/student",
      },
      {
        source: "/estudante/:path*",
        destination: "/student/:path*",
      },
    ];
  },
};

export default nextConfig;
