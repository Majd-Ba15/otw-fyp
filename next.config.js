// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['localhost', 'i.ibb.co'] },

  // Proxy backend calls via /backend-api/* to avoid conflicting with
  // the local /pages/api/* routes (upload, chat/support, rides/match).
  // The browser calls /backend-api/... → Next.js server forwards to localhost:5000/api/...
  // No CORS because the forwarding is server-to-server.
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:5000'
    return [
      { source: '/backend-api/:path*', destination: `${backend}/:path*` },
    ]
  },
}

module.exports = nextConfig
