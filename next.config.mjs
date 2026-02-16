/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb',
    },
    middlewareClientMaxBodySize: 100 * 1024 * 1024,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  crossOrigin: 'anonymous',
}

export default nextConfig
