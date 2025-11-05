const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/internal-api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/login",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
