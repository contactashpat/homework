const isDev = process.env.NODE_ENV === "development";

const scriptSrc = ["'self'", "'unsafe-inline'"];
if (isDev) {
  scriptSrc.push("'unsafe-eval'");
}

const connectSrc = ["'self'"];
if (isDev) {
  connectSrc.push("ws://localhost:3000", "ws://127.0.0.1:3000");
}

const ContentSecurityPolicy = [
  "default-src 'self';",
  `script-src ${scriptSrc.join(" ")};`,
  "script-src-attr 'none';",
  `connect-src ${connectSrc.join(" ")};`,
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: blob:;",
  "font-src 'self';",
  "object-src 'none';",
  "frame-ancestors 'none';",
  "base-uri 'self';",
  "form-action 'self';",
].join(" ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
