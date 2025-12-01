// next.config.mjs (Hapus allowedDevOrigins)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Hapus seluruh blok experimental jika Anda hanya menggunakannya untuk allowedDevOrigins
  // Jika ada eksperimen lain, pertahankan, tetapi HAPUS allowedDevOrigins.
  // experimental: { 
  //   allowedDevOrigins: [ ... ] 
  // }, 
}

export default nextConfig