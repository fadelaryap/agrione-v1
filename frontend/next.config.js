/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  experimental: {
    // Disable server minification to avoid AbortSignal issues with @google-cloud/storage
    // See: https://github.com/vercel/next.js/issues/55682
    serverMinification: false,
  },
  // Skip type checking during build to reduce memory usage if OOM occurs
  // Set SKIP_TYPE_CHECK=true in Docker build args to skip type checking
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },
  // Skip ESLint during build to reduce memory usage
  // Set SKIP_ESLINT=true in Docker build args to skip ESLint
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_ESLINT === 'true',
  },
}

module.exports = nextConfig

