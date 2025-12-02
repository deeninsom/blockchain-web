// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  crossOrigin: 'anonymous',
}

export default nextConfig;